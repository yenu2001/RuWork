import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import Admin from "../models/admin.js";
import {
    ADMIN_ROLE,
    getPasswordValidationError,
    hasBasicEmailFormat,
    normalizeEmail
} from "../utils/account.js";

async function createAdmin() {
    const mongoUrl = process.env.MONGODB_URI?.trim();
    const firstName = process.env.ADMIN_FIRST_NAME?.trim();
    const lastName = process.env.ADMIN_LAST_NAME?.trim();
    const email = normalizeEmail(process.env.ADMIN_EMAIL);
    const password = process.env.ADMIN_PASSWORD;

    if (!mongoUrl) {
        throw new Error("MONGODB_URI is not configured");
    }

    if (!firstName || !lastName) {
        throw new Error("ADMIN_FIRST_NAME and ADMIN_LAST_NAME are required");
    }

    if (!hasBasicEmailFormat(email)) {
        throw new Error("ADMIN_EMAIL must be a valid email address");
    }

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
        throw new Error(`ADMIN_PASSWORD is invalid: ${passwordError}`);
    }

    await mongoose.connect(mongoUrl);

    const existingAdmin = await Admin.exists({ email });
    if (existingAdmin) {
        throw new Error("An Admin account already uses this email address");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await Admin.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: ADMIN_ROLE
    });

    console.log("Admin account created successfully.");
}

createAdmin()
    .catch((error) => {
        console.error(`Admin creation failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });

