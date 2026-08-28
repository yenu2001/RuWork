import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
    approveRegistration,
    listRegistrations,
    rejectRegistration
} from "../controllers/adminController.js";
import {
    resendStudentVerification,
    verifyJobProviderEmail,
    verifyStudentEmail
} from "../controllers/emailVerificationController.js";
import {
    loginJobProvider,
    registerJobProvider
} from "../controllers/jobProviderController.js";
import { loginUser, registerUser } from "../controllers/userController.js";
import {
    authenticateToken,
    isAdmin,
    requireApprovedJobProvider,
    requireEligibleRuhunaStudent
} from "../middlewears/authMiddleware.js";
import JobProvider from "../models/jobProvider.js";
import User from "../models/user.js";
import adminRouter from "../routes/adminRouter.js";
import {
    ADMIN_ROLE,
    JOB_PROVIDER_ROLE,
    STUDENT_ROLE,
    UNIVERSITY_NAME
} from "../utils/account.js";
import { emailDelivery, buildVerificationUrl } from "../utils/emailService.js";
import {
    getVerificationResendWaitSeconds,
    hashVerificationToken,
    issueVerificationToken
} from "../utils/emailVerification.js";

const TEST_PASSWORD = "Secure123";

function createResponse() {
    return {
        statusCode: 200,
        headers: {},
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        set(name, value) {
            this.headers[name] = value;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };
}

function makeStudent(overrides = {}) {
    return new User({
        firstName: "Test",
        lastName: "Student",
        email: "student@ruh.ac.lk",
        phoneNumber: "0712345678",
        dateOfBirth: new Date("2002-01-01"),
        gender: "Prefer not to say",
        password: "hashed-password",
        university: UNIVERSITY_NAME,
        faculty: "Science",
        fieldOfStudy: "Computer Science",
        yearOfStudy: "2nd Year",
        ...overrides
    });
}

function makeProvider(overrides = {}) {
    return new JobProvider({
        companyName: "Test Company",
        companyEmail: "provider@example.com",
        phoneNumber: "0712345678",
        companyAddress: "Matara",
        companySize: "1-10",
        industry: "Technology",
        companyDescription: "A test provider",
        firstName: "Test",
        lastName: "Provider",
        password: "hashed-password",
        ...overrides
    });
}

async function withJwtSecret(callback) {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "phase-two-test-secret";

    try {
        return await callback();
    } finally {
        if (previousSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = previousSecret;
        }
    }
}

function installVerificationLookup(Model, account) {
    const originalFindOne = Model.findOne;
    Model.findOne = (filter) => ({
        select: async () => {
            const expiryMatches = account.emailVerificationExpiresAt &&
                account.emailVerificationExpiresAt > filter.emailVerificationExpiresAt.$gt;
            const hashMatches = account.emailVerificationTokenHash ===
                filter.emailVerificationTokenHash;
            return expiryMatches && hashMatches ? account : null;
        }
    });

    return () => {
        Model.findOne = originalFindOne;
    };
}

test("student domain policy rejects common and deceptive domains", async () => {
    const invalidEmails = [
        "student@gmail.com",
        "student@ruh.ac.lk.example.com",
        "student@subdomain.ruh.ac.lk",
        "student@fakeruh.ac.lk"
    ];

    for (const email of invalidEmails) {
        const student = makeStudent({ email });
        await assert.rejects(
            student.validate(),
            /official University of Ruhuna domain/,
            `${email} should be rejected`
        );
    }

    await makeStudent().validate();
});

test("student registration forces identity, hashes password, and stores only a token hash", async () => {
    const originalSave = User.prototype.save;
    const originalSend = emailDelivery.sendVerificationEmail;
    let savedStudent;
    let emailPayload;

    User.prototype.save = async function saveWithoutDatabase() {
        savedStudent = this;
        await this.validate();
        return this;
    };
    emailDelivery.sendVerificationEmail = async (payload) => {
        emailPayload = payload;
    };

    try {
        const req = {
            body: {
                firstName: "Test",
                lastName: "Student",
                email: " STUDENT@RUH.AC.LK ",
                phoneNumber: "0712345678",
                dateOfBirth: "2002-01-01",
                gender: "Prefer not to say",
                password: TEST_PASSWORD,
                faculty: "Science",
                fieldOfStudy: "Computer Science",
                yearOfStudy: "2nd Year",
                role: ADMIN_ROLE,
                accountStatus: "approved",
                isEmailVerified: true
            }
        };
        const res = createResponse();

        await registerUser(req, res);

        assert.equal(res.statusCode, 201);
        assert.equal(savedStudent.role, STUDENT_ROLE);
        assert.equal(savedStudent.university, UNIVERSITY_NAME);
        assert.equal(savedStudent.accountStatus, "pending");
        assert.equal(savedStudent.isEmailVerified, false);
        assert.equal(await bcrypt.compare(TEST_PASSWORD, savedStudent.password), true);
        assert.notEqual(savedStudent.emailVerificationTokenHash, emailPayload.token);
        assert.equal(
            savedStudent.emailVerificationTokenHash,
            hashVerificationToken(emailPayload.token)
        );
    } finally {
        User.prototype.save = originalSave;
        emailDelivery.sendVerificationEmail = originalSend;
    }
});

test("provider registration starts unverified and pending with canonical email", async () => {
    const originalSave = JobProvider.prototype.save;
    const originalSend = emailDelivery.sendVerificationEmail;
    let savedProvider;

    JobProvider.prototype.save = async function saveWithoutDatabase() {
        savedProvider = this;
        await this.validate();
        return this;
    };
    emailDelivery.sendVerificationEmail = async () => {};

    try {
        const req = {
            body: {
                companyName: "Test Company",
                companyEmail: " CONTACT@EXAMPLE.COM ",
                phoneNumber: "0712345678",
                companyAddress: "Matara",
                companySize: "1-10",
                industry: "Technology",
                companyDescription: "A test provider",
                firstName: "Test",
                lastName: "Provider",
                password: TEST_PASSWORD,
                role: ADMIN_ROLE,
                accountStatus: "approved",
                isEmailVerified: true
            }
        };
        const res = createResponse();

        await registerJobProvider(req, res);

        assert.equal(res.statusCode, 201);
        assert.equal(savedProvider.companyEmail, "contact@example.com");
        assert.equal(savedProvider.role, JOB_PROVIDER_ROLE);
        assert.equal(savedProvider.accountStatus, "pending");
        assert.equal(savedProvider.isEmailVerified, false);
    } finally {
        JobProvider.prototype.save = originalSave;
        emailDelivery.sendVerificationEmail = originalSend;
    }
});

test("valid verification token verifies once and remains pending", async () => {
    const student = makeStudent();
    const rawToken = issueVerificationToken(student);
    student.save = async function saveWithoutDatabase() {
        return this;
    };
    const restoreFindOne = installVerificationLookup(User, student);

    try {
        const firstResponse = createResponse();
        await verifyStudentEmail({ params: { token: rawToken } }, firstResponse);

        assert.equal(firstResponse.statusCode, 200);
        assert.equal(student.isEmailVerified, true);
        assert.equal(student.accountStatus, "pending");
        assert.equal(student.emailVerificationTokenHash, undefined);

        const secondResponse = createResponse();
        await verifyStudentEmail({ params: { token: rawToken } }, secondResponse);
        assert.equal(secondResponse.statusCode, 400);
        assert.equal(secondResponse.body.code, "INVALID_OR_EXPIRED_VERIFICATION_TOKEN");
    } finally {
        restoreFindOne();
    }
});

test("expired and malformed verification tokens fail", async () => {
    const student = makeStudent();
    const rawToken = issueVerificationToken(student, new Date(Date.now() - 60 * 60 * 1000));
    const restoreFindOne = installVerificationLookup(User, student);

    try {
        const expiredResponse = createResponse();
        await verifyStudentEmail({ params: { token: rawToken } }, expiredResponse);
        assert.equal(expiredResponse.statusCode, 400);

        const malformedResponse = createResponse();
        await verifyStudentEmail({ params: { token: "not-a-token" } }, malformedResponse);
        assert.equal(malformedResponse.statusCode, 400);
    } finally {
        restoreFindOne();
    }
});

test("Provider verification uses the same single-use mechanism", async () => {
    const provider = makeProvider();
    const rawToken = issueVerificationToken(provider);
    provider.save = async function saveWithoutDatabase() {
        return this;
    };
    const restoreFindOne = installVerificationLookup(JobProvider, provider);

    try {
        const res = createResponse();
        await verifyJobProviderEmail({ params: { token: rawToken } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(provider.isEmailVerified, true);
        assert.equal(provider.accountStatus, "pending");
        assert.equal(provider.emailVerificationTokenHash, undefined);
    } finally {
        restoreFindOne();
    }
});

test("resend replaces the old Student verification token", async () => {
    const student = makeStudent({
        verificationEmailSentAt: new Date(Date.now() - 2 * 60 * 1000)
    });
    const oldToken = issueVerificationToken(
        student,
        new Date(Date.now() - 2 * 60 * 1000)
    );
    const oldHash = student.emailVerificationTokenHash;
    const originalFindOne = User.findOne;
    const originalSend = emailDelivery.sendVerificationEmail;
    let sentToken;

    User.findOne = () => ({ select: async () => student });
    student.save = async function saveWithoutDatabase() {
        return this;
    };
    emailDelivery.sendVerificationEmail = async ({ token }) => {
        sentToken = token;
    };

    try {
        const res = createResponse();
        await resendStudentVerification(
            { body: { email: student.email } },
            res
        );

        assert.equal(res.statusCode, 200);
        assert.notEqual(student.emailVerificationTokenHash, oldHash);
        assert.notEqual(sentToken, oldToken);
        assert.equal(student.emailVerificationTokenHash, hashVerificationToken(sentToken));
    } finally {
        User.findOne = originalFindOne;
        emailDelivery.sendVerificationEmail = originalSend;
    }
});

test("verification resend cooldown reports a retry interval", () => {
    const now = new Date();
    const student = makeStudent({ verificationEmailSentAt: now });
    assert.ok(getVerificationResendWaitSeconds(student, now) > 0);
});

test("verification URL targets the frontend without exposing a backend secret", () => {
    const previousClientUrl = process.env.CLIENT_URL;
    process.env.CLIENT_URL = "http://localhost:5173";

    try {
        const url = buildVerificationUrl("raw-token", "student");
        assert.equal(
            url,
            "http://localhost:5173/verify-email?token=raw-token&type=student"
        );
    } finally {
        if (previousClientUrl === undefined) {
            delete process.env.CLIENT_URL;
        } else {
            process.env.CLIENT_URL = previousClientUrl;
        }
    }
});

test("non-Admin JWT cannot list registrations", async () => {
    await withJwtSecret(async () => {
        const token = jwt.sign({ role: STUDENT_ROLE, sub: new mongoose.Types.ObjectId() }, process.env.JWT_SECRET);
        const req = { get: () => `Bearer ${token}`, query: {} };
        const res = createResponse();

        await authenticateToken(req, res, () =>
            isAdmin(req, res, () => listRegistrations(req, res))
        );

        assert.equal(res.statusCode, 403);
    });
});

test("public Admin registration route remains unavailable", () => {
    const publicAdminRegistration = adminRouter.stack.some((layer) =>
        layer.route?.path === "/" && layer.route.methods?.post
    );
    assert.equal(publicAdminRegistration, false);
});

test("Admin can list registrations without sensitive fields", async () => {
    const originalUserFind = User.find;
    const originalProviderFind = JobProvider.find;
    const originalUserCount = User.countDocuments;
    const originalProviderCount = JobProvider.countDocuments;
    const student = makeStudent();
    const provider = makeProvider();
    const registrationQuery = (result) => ({
        sort() { return this; }, limit() { return this; }, lean() { return this; },
        async exec() { return result; }
    });
    User.find = () => registrationQuery([student]);
    JobProvider.find = () => registrationQuery([provider]);
    User.countDocuments = async () => 1;
    JobProvider.countDocuments = async () => 1;

    try {
        await withJwtSecret(async () => {
            const token = jwt.sign({ role: ADMIN_ROLE, sub: new mongoose.Types.ObjectId() }, process.env.JWT_SECRET);
            const req = { get: () => `Bearer ${token}`, query: {} };
            const res = createResponse();

            await authenticateToken(req, res, () =>
                isAdmin(req, res, () => listRegistrations(req, res))
            );

            assert.equal(res.statusCode, 200);
            assert.equal(res.body.count, 2);
            assert.deepEqual(res.body.pagination, { page: 1, limit: 20, total: 2, pages: 1 });
            for (const registration of res.body.registrations) {
                assert.equal("password" in registration, false);
                assert.equal("emailVerificationTokenHash" in registration, false);
                assert.equal("emailVerificationExpiresAt" in registration, false);
            }
        });
    } finally {
        User.find = originalUserFind;
        JobProvider.find = originalProviderFind;
        User.countDocuments = originalUserCount;
        JobProvider.countDocuments = originalProviderCount;
    }
});

async function reviewAccount({ account, Model, controller, body = {} }) {
    const originalFindById = Model.findById;
    Model.findById = async () => account;
    account.save = async function saveWithoutDatabase() {
        return this;
    };

    try {
        const req = {
            params: {
                type: Model === User ? "student" : "jobProvider",
                id: account._id.toString()
            },
            body,
            user: { sub: new mongoose.Types.ObjectId().toString(), role: ADMIN_ROLE }
        };
        const res = createResponse();
        await controller(req, res);
        return res;
    } finally {
        Model.findById = originalFindById;
    }
}

test("Admin can approve verified pending Student and Provider registrations", async () => {
    const student = makeStudent({ isEmailVerified: true });
    const provider = makeProvider({ isEmailVerified: true });

    const studentResponse = await reviewAccount({
        account: student,
        Model: User,
        controller: approveRegistration
    });
    const providerResponse = await reviewAccount({
        account: provider,
        Model: JobProvider,
        controller: approveRegistration
    });

    assert.equal(studentResponse.statusCode, 200);
    assert.equal(student.accountStatus, "approved");
    assert.equal(providerResponse.statusCode, 200);
    assert.equal(provider.accountStatus, "approved");
});

test("Admin can reject pending Student and Provider registrations", async () => {
    const student = makeStudent({ isEmailVerified: true });
    const provider = makeProvider({ isEmailVerified: true });

    const studentResponse = await reviewAccount({
        account: student,
        Model: User,
        controller: rejectRegistration,
        body: { rejectionReason: " Incomplete academic information " }
    });
    const providerResponse = await reviewAccount({
        account: provider,
        Model: JobProvider,
        controller: rejectRegistration
    });

    assert.equal(studentResponse.statusCode, 200);
    assert.equal(student.accountStatus, "rejected");
    assert.equal(student.rejectionReason, "Incomplete academic information");
    assert.equal(providerResponse.statusCode, 200);
    assert.equal(provider.accountStatus, "rejected");
});

test("Admin cannot approve an unverified or already reviewed registration", async () => {
    const unverified = makeStudent();
    const unverifiedResponse = await reviewAccount({
        account: unverified,
        Model: User,
        controller: approveRegistration
    });
    assert.equal(unverifiedResponse.statusCode, 409);
    assert.equal(unverifiedResponse.body.code, "EMAIL_NOT_VERIFIED");

    const approved = makeStudent({ isEmailVerified: true, accountStatus: "approved" });
    const approvedResponse = await reviewAccount({
        account: approved,
        Model: User,
        controller: approveRegistration
    });
    assert.equal(approvedResponse.statusCode, 409);
    assert.equal(approvedResponse.body.code, "REGISTRATION_ALREADY_REVIEWED");
});

async function runStudentLogin(student) {
    const originalFindOne = User.findOne;
    User.findOne = async () => student;

    try {
        const res = createResponse();
        await loginUser({ body: { email: student.email, password: TEST_PASSWORD } }, res);
        return res;
    } finally {
        User.findOne = originalFindOne;
    }
}

test("Student login enforces unverified, pending, rejected, and approved states", async () => {
    await withJwtSecret(async () => {
        const password = await bcrypt.hash(TEST_PASSWORD, 4);
        const unverified = await runStudentLogin(makeStudent({ password }));
        const pending = await runStudentLogin(makeStudent({ password, isEmailVerified: true }));
        const rejected = await runStudentLogin(makeStudent({
            password,
            isEmailVerified: true,
            accountStatus: "rejected"
        }));
        const approved = await runStudentLogin(makeStudent({
            password,
            isEmailVerified: true,
            accountStatus: "approved"
        }));

        assert.equal(unverified.body.code, "EMAIL_NOT_VERIFIED");
        assert.equal("token" in unverified.body, false);
        assert.equal(pending.body.code, "ACCOUNT_PENDING");
        assert.equal("token" in pending.body, false);
        assert.equal(rejected.body.code, "ACCOUNT_REJECTED");
        assert.equal("token" in rejected.body, false);
        assert.equal(typeof approved.body.token, "string");
    });
});

async function runProviderLogin(provider) {
    const originalFindOne = JobProvider.findOne;
    JobProvider.findOne = async () => provider;

    try {
        const res = createResponse();
        await loginJobProvider({
            body: { companyEmail: provider.companyEmail, password: TEST_PASSWORD }
        }, res);
        return res;
    } finally {
        JobProvider.findOne = originalFindOne;
    }
}

test("Provider login enforces unverified, pending, rejected, and approved states", async () => {
    await withJwtSecret(async () => {
        const password = await bcrypt.hash(TEST_PASSWORD, 4);
        const unverified = await runProviderLogin(makeProvider({ password }));
        const pending = await runProviderLogin(makeProvider({ password, isEmailVerified: true }));
        const rejected = await runProviderLogin(makeProvider({
            password,
            isEmailVerified: true,
            accountStatus: "rejected"
        }));
        const approved = await runProviderLogin(makeProvider({
            password,
            isEmailVerified: true,
            accountStatus: "approved"
        }));

        assert.equal(unverified.body.code, "EMAIL_NOT_VERIFIED");
        assert.equal(pending.body.code, "ACCOUNT_PENDING");
        assert.equal(rejected.body.code, "ACCOUNT_REJECTED");
        assert.equal(typeof approved.body.token, "string");
    });
});

test("authoritative Student eligibility middleware accepts only a current eligible account", async () => {
    const originalFindById = User.findById;
    let currentStudent = {
        role: STUDENT_ROLE,
        email: "student@ruh.ac.lk",
        university: UNIVERSITY_NAME,
        isEmailVerified: true,
        accountStatus: "approved"
    };
    User.findById = async () => currentStudent;

    try {
        const eligibleResponse = createResponse();
        let passed = false;
        await requireEligibleRuhunaStudent(
            { user: { sub: new mongoose.Types.ObjectId().toString() } },
            eligibleResponse,
            () => {
                passed = true;
            }
        );
        assert.equal(passed, true);

        const ineligibleVariants = [
            { accountStatus: "pending" },
            { isEmailVerified: false },
            { university: "Another University" },
            { email: "student@subdomain.ruh.ac.lk" },
            { role: JOB_PROVIDER_ROLE }
        ];

        for (const invalidFields of ineligibleVariants) {
            currentStudent = {
                role: STUDENT_ROLE,
                email: "student@ruh.ac.lk",
                university: UNIVERSITY_NAME,
                isEmailVerified: true,
                accountStatus: "approved",
                ...invalidFields
            };
            const response = createResponse();
            await requireEligibleRuhunaStudent(
                { user: { sub: new mongoose.Types.ObjectId().toString() } },
                response,
                () => {
                    throw new Error("Ineligible Student passed eligibility middleware");
                }
            );
            assert.equal(response.statusCode, 403);
        }
    } finally {
        User.findById = originalFindById;
    }
});

test("authoritative Provider middleware blocks unapproved publishing", async () => {
    const originalFindById = JobProvider.findById;
    const provider = {
        role: JOB_PROVIDER_ROLE,
        companyEmail: "provider@example.com",
        isEmailVerified: true,
        accountStatus: "pending"
    };
    JobProvider.findById = async () => provider;

    try {
        const res = createResponse();
        await requireApprovedJobProvider(
            { user: { sub: new mongoose.Types.ObjectId().toString() } },
            res,
            () => {
                throw new Error("Pending Provider passed publishing middleware");
            }
        );
        assert.equal(res.statusCode, 403);
    } finally {
        JobProvider.findById = originalFindById;
    }
});
