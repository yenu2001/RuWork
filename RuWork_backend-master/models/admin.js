import mongoose from "mongoose";
import { ADMIN_ROLE, normalizeEmail } from "../utils/account.js";

const adminSchema = new mongoose.Schema({

    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        set: normalizeEmail
    },
    password: {
        type: String,
        required: true
    },
    passwordChangedAt: {
        type: Date
    },
    tokenVersion: {
        type: Number,
        default: 0,
        min: 0
    },
    role:{
        type: String,
        enum: [ADMIN_ROLE],
        default: ADMIN_ROLE,
        immutable: true
    }
},{ timestamps: true });

const Admin = mongoose.model("Admin",adminSchema);

export default Admin;
