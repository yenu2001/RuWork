import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import JobProvider from "../models/jobProvider.js";
import User from "../models/user.js";
import {
    JOB_PROVIDER_ROLE,
    UNIVERSITY_NAME,
    isAllowedStudentEmail,
    normalizeEmail
} from "../utils/account.js";
import {
    authenticateToken,
    isJobProvider
} from "../middlewears/authMiddleware.js";

const validStudent = {
    firstName: "Test",
    lastName: "Student",
    email: " student@RUH.AC.LK ",
    phoneNumber: "0712345678",
    dateOfBirth: new Date("2002-01-01"),
    gender: "Prefer not to say",
    password: "already-hashed",
    fieldOfStudy: "Computer Science",
    yearOfStudy: "2nd Year"
};

test("student email normalization and exact-domain checks", () => {
    assert.equal(normalizeEmail(" Student@RUH.AC.LK "), "student@ruh.ac.lk");
    assert.equal(isAllowedStudentEmail(" Student@RUH.AC.LK "), true);
    assert.equal(isAllowedStudentEmail("student@sub.ruh.ac.lk"), false);
    assert.equal(isAllowedStudentEmail("student@ruh.ac.lk.example.com"), false);
    assert.equal(isAllowedStudentEmail("student@@ruh.ac.lk"), false);
    assert.equal(isAllowedStudentEmail("student name@ruh.ac.lk"), false);
});

test("student schema fixes university and approval defaults", async () => {
    const student = new User(validStudent);

    await student.validate();

    assert.equal(student.email, "student@ruh.ac.lk");
    assert.equal(student.university, UNIVERSITY_NAME);
    assert.equal(student.role, "student");
    assert.equal(student.isEmailVerified, false);
    assert.equal(student.accountStatus, "pending");
});

test("student schema rejects a non-Ruhuna university email", async () => {
    const student = new User({ ...validStudent, email: "student@example.com" });

    await assert.rejects(student.validate(), /official University of Ruhuna domain/);
});

test("provider schema normalizes its canonical companyEmail and role", async () => {
    const provider = new JobProvider({
        companyName: "Test Company",
        companyEmail: " CONTACT@EXAMPLE.COM ",
        phoneNumber: "0712345678",
        companyAddress: "Matara",
        companySize: "1-10",
        industry: "Technology",
        companyDescription: "A test provider",
        firstName: "Test",
        lastName: "Provider",
        password: "already-hashed"
    });

    await provider.validate();

    assert.equal(provider.companyEmail, "contact@example.com");
    assert.equal(provider.role, JOB_PROVIDER_ROLE);
    assert.equal(provider.accountStatus, "pending");
    assert.equal(provider.isEmailVerified, false);
});

test("JWT middleware verifies tokens and provider role", () => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "foundation-test-secret";

    try {
        const token = jwt.sign({ role: JOB_PROVIDER_ROLE }, process.env.JWT_SECRET);
        const req = { get: () => `Bearer ${token}` };
        const res = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(payload) {
                this.payload = payload;
                return this;
            }
        };
        let authenticated = false;
        let authorized = false;

        authenticateToken(req, res, () => {
            authenticated = true;
        });
        isJobProvider(req, res, () => {
            authorized = true;
        });

        assert.equal(authenticated, true);
        assert.equal(authorized, true);
        assert.equal(req.user.role, JOB_PROVIDER_ROLE);
    } finally {
        if (previousSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = previousSecret;
        }
    }
});

test("JWT middleware rejects an invalid token", () => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "foundation-test-secret";

    try {
        const req = { get: () => "Bearer invalid-token" };
        const res = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(payload) {
                this.payload = payload;
                return this;
            }
        };

        authenticateToken(req, res, () => {
            throw new Error("Invalid token reached next middleware");
        });

        assert.equal(res.statusCode, 401);
    } finally {
        if (previousSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = previousSecret;
        }
    }
});
