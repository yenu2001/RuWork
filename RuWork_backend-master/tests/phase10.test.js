import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Admin from "../models/admin.js";
import JobProvider from "../models/jobProvider.js";
import User from "../models/user.js";
import {
    changePassword,
    logoutAllSessions,
    requestPasswordReset,
    resetPassword
} from "../controllers/passwordController.js";
import { getHealth } from "../controllers/healthController.js";
import { errorHandler, notFoundHandler, requireObjectBody } from "../middlewears/errorHandler.js";
import {
    requireAdminAccount,
    requireApprovedJobProvider,
    requireEligibleRuhunaStudent
} from "../middlewears/authMiddleware.js";
import adminRouter from "../routes/adminRouter.js";
import userRouter from "../routes/userRouter.js";
import jobProviderRouter from "../routes/jobProviderRouter.js";
import {
    UNIVERSITY_NAME,
    createAccessToken,
    isTokenVersionCurrent
} from "../utils/account.js";
import { getCorsOrigins, getEnvironmentProblems, isTestEnvironment } from "../utils/env.js";
import { logger, redact } from "../utils/logger.js";
import {
    clearResetToken,
    getResetCooldownWaitSeconds,
    hashResetToken,
    isResetTokenFormatValid,
    issueResetToken,
    revokeIssuedTokens
} from "../utils/password.js";
import { emailDelivery } from "../utils/emailService.js";

function response() {
    return {
        statusCode: 200, body: undefined,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

function student(overrides = {}) {
    return new User({
        _id: new mongoose.Types.ObjectId(), firstName: "Ruhuna", lastName: "Student",
        email: "student@ruh.ac.lk", phoneNumber: "0712345678", dateOfBirth: "2002-01-01",
        gender: "Prefer not to say", password: "hashed", university: UNIVERSITY_NAME,
        faculty: "Science", fieldOfStudy: "Computer Science", yearOfStudy: "2nd Year",
        isEmailVerified: true, accountStatus: "approved", ...overrides
    });
}

function provider(overrides = {}) {
    return new JobProvider({
        _id: new mongoose.Types.ObjectId(), companyName: "Current Company",
        companyEmail: "jobs@example.com", phoneNumber: "0712345678", companyAddress: "Matara",
        companySize: "11-50", industry: "Technology", companyDescription: "A trusted provider.",
        firstName: "Test", lastName: "Provider", password: "hashed",
        isEmailVerified: true, accountStatus: "approved", ...overrides
    });
}

function routeExists(router, method, path) {
    return router.stack.some((layer) => layer.route?.path === path && layer.route.methods?.[method]);
}

async function withJwtSecret(run) {
    const previous = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "phase-ten-test-secret";
    try { return await run(); } finally {
        if (previous === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previous;
    }
}

async function withProductionEnv(overrides, run) {
    const keys = ["NODE_ENV", "RUWORK_TEST_MODE", "JWT_SECRET", "MONGODB_URI", "CLIENT_URL", "CORS_ORIGINS",
        "EMAIL_HOST", "EMAIL_USER", "EMAIL_PASSWORD", "EMAIL_FROM"];
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    Object.assign(process.env, { NODE_ENV: "production", RUWORK_TEST_MODE: "" }, overrides);
    try { return await run(); } finally {
        for (const key of keys) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
    }
}

test("the test-support gate is explicit and can never activate in production", async () => {
    assert.equal(isTestEnvironment(), true, "tests/testEnv.js must enable the gate");
    await withProductionEnv({ RUWORK_TEST_MODE: "true" }, () => {
        assert.equal(isTestEnvironment(), false, "production must ignore RUWORK_TEST_MODE");
    });
});

test("startup validation reports every production misconfiguration without echoing values", async () => {
    await withProductionEnv({
        MONGODB_URI: "", JWT_SECRET: "short", CLIENT_URL: "", CORS_ORIGINS: "*",
        EMAIL_HOST: "", EMAIL_USER: "", EMAIL_PASSWORD: "", EMAIL_FROM: "", RUWORK_TEST_MODE: "true"
    }, () => {
        const problems = getEnvironmentProblems().join("\n");
        for (const expected of ["MONGODB_URI", "at least 32 characters", "wildcard", "EMAIL_HOST", "RUWORK_TEST_MODE"]) {
            assert.ok(problems.includes(expected), `${expected} missing from ${problems}`);
        }
        assert.equal(problems.includes("short"), false, "the secret value must never be echoed");
    });

    await withProductionEnv({
        MONGODB_URI: "mongodb://localhost:27017/ruwork",
        JWT_SECRET: "a".repeat(40), CORS_ORIGINS: "https://app.example.com", CLIENT_URL: "https://app.example.com",
        EMAIL_HOST: "smtp.example.com", EMAIL_USER: "mailer", EMAIL_PASSWORD: "secret", EMAIL_FROM: "no-reply@example.com"
    }, () => {
        assert.deepEqual(getEnvironmentProblems(), []);
        assert.deepEqual(getCorsOrigins(), ["https://app.example.com"]);
    });
});

test("the logger redacts secrets by key, by shape, and never emits in tests", () => {
    const scrubbed = redact({
        password: "PlainTextPassword1", newPassword: "Another1", token: "abc", authorization: "Bearer x",
        emailVerificationTokenHash: "f".repeat(64), MONGODB_URI: "mongodb+srv://user:pw@cluster/db",
        note: `token ${"a".repeat(64)} and mongodb://user:pw@host/db`,
        jwt: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvbmUifQ.c2lnbmF0dXJl",
        safe: "Research Assistant", nested: { secret: "s", keep: 5 }
    });
    for (const key of ["password", "newPassword", "token", "authorization", "emailVerificationTokenHash", "MONGODB_URI"]) {
        assert.equal(scrubbed[key], "[redacted]", key);
    }
    assert.equal(scrubbed.note.includes("a".repeat(64)), false);
    assert.equal(scrubbed.note.includes("mongodb://"), false);
    assert.equal(scrubbed.jwt, "[redacted]");
    assert.equal(scrubbed.safe, "Research Assistant");
    assert.equal(scrubbed.nested.secret, "[redacted]");
    assert.equal(scrubbed.nested.keep, 5);

    const written = [];
    const originalWrite = process.stdout.write;
    process.stdout.write = (chunk) => { written.push(chunk); return true; };
    try { logger.info("should stay silent in tests", { password: "x" }); } finally { process.stdout.write = originalWrite; }
    assert.deepEqual(written, []);
});

test("centralized error handling returns safe bodies and never leaks a stack trace", () => {
    const parseFailure = response();
    errorHandler(Object.assign(new SyntaxError("Unexpected token"), { type: "entity.parse.failed" }), { method: "POST", path: "/api/jobs" }, parseFailure, () => {});
    assert.equal(parseFailure.statusCode, 400);
    assert.equal(parseFailure.body.code, "INVALID_JSON");

    const tooLarge = response();
    errorHandler({ type: "entity.too.large" }, { method: "POST", path: "/api/jobs" }, tooLarge, () => {});
    assert.equal(tooLarge.statusCode, 413);

    const duplicate = response();
    errorHandler({ code: 11000 }, { method: "POST", path: "/api/users" }, duplicate, () => {});
    assert.equal(duplicate.statusCode, 409);

    const unexpected = response();
    const failure = new Error("Mongo credentials mongodb://user:pw@host/db rejected");
    failure.stack = "Error: internal\n    at secretFrame (/srv/app/index.js:1:1)";
    errorHandler(failure, { method: "GET", path: "/api/jobs" }, unexpected, () => {});
    assert.equal(unexpected.statusCode, 500);
    assert.equal(unexpected.body.error, "An unexpected server error occurred");
    assert.ok(unexpected.body.reference);
    const serialized = JSON.stringify(unexpected.body);
    assert.equal(serialized.includes("secretFrame"), false);
    assert.equal(serialized.includes("mongodb://"), false);

    const missing = response();
    notFoundHandler({}, missing);
    assert.equal(missing.statusCode, 404);
});

test("non-object request bodies are rejected before any controller runs", () => {
    for (const body of [["array"], "text", 12, null]) {
        const res = response();
        let reached = false;
        requireObjectBody({ method: "POST", body }, res, () => { reached = true; });
        assert.equal(reached, false, JSON.stringify(body));
        assert.equal(res.statusCode, 400);
    }
    let allowed = false;
    requireObjectBody({ method: "POST", body: { jobTitle: "ok" } }, response(), () => { allowed = true; });
    assert.equal(allowed, true);
    let readAllowed = false;
    requireObjectBody({ method: "GET", body: undefined }, response(), () => { readAllowed = true; });
    assert.equal(readAllowed, true);
});

test("access tokens carry a revocation claim that every authoritative guard enforces", async () => {
    await withJwtSecret(async () => {
        const account = student({ tokenVersion: 2 });
        const claims = jwt.verify(createAccessToken(account, account.email), process.env.JWT_SECRET);
        assert.equal(claims.tv, 2);
        assert.equal(isTokenVersionCurrent(claims, account), true);
        assert.equal(isTokenVersionCurrent(claims, student({ tokenVersion: 3 })), false);
        // Pre-Phase-10 tokens carry no claim and must still match a default account.
        assert.equal(isTokenVersionCurrent({}, student()), true);
    });

    const cases = [
        { Model: User, guard: requireEligibleRuhunaStudent, account: student({ tokenVersion: 4 }) },
        { Model: JobProvider, guard: requireApprovedJobProvider, account: provider({ tokenVersion: 4 }) },
        { Model: Admin, guard: requireAdminAccount, account: new Admin({ _id: new mongoose.Types.ObjectId(), firstName: "A", lastName: "B", email: "admin@example.com", password: "hashed", tokenVersion: 4 }) }
    ];
    for (const { Model, guard, account } of cases) {
        const original = Model.findById;
        Model.findById = async () => account;
        try {
            const stale = response();
            let reached = false;
            await guard({ user: { sub: account._id.toString(), tv: 3 } }, stale, () => { reached = true; });
            assert.equal(reached, false, `${Model.modelName} accepted a revoked token`);
            assert.equal(stale.statusCode, 401);
            assert.equal(stale.body.code, "TOKEN_REVOKED");

            let currentReached = false;
            await guard({ user: { sub: account._id.toString(), tv: 4 } }, response(), () => { currentReached = true; });
            assert.equal(currentReached, true, `${Model.modelName} rejected a current token`);
        } finally { Model.findById = original; }
    }
});

test("password change requires the current password, rejects reuse, and revokes other sessions", async () => {
    await withJwtSecret(async () => {
        const account = student({ password: await bcrypt.hash("CurrentPass1", 10), tokenVersion: 1 });
        let saved = false;
        account.save = async () => { saved = true; return account; };
        const original = User.findById;
        User.findById = async () => account;
        try {
            const wrong = response();
            await changePassword("student")({ user: { sub: account._id.toString() }, body: { currentPassword: "WrongPass1", newPassword: "BrandNew1" } }, wrong);
            assert.equal(wrong.statusCode, 401);
            assert.equal(wrong.body.code, "CURRENT_PASSWORD_INVALID");

            const weak = response();
            await changePassword("student")({ user: { sub: account._id.toString() }, body: { currentPassword: "CurrentPass1", newPassword: "weak" } }, weak);
            assert.equal(weak.statusCode, 400);

            const reused = response();
            await changePassword("student")({ user: { sub: account._id.toString() }, body: { currentPassword: "CurrentPass1", newPassword: "CurrentPass1" } }, reused);
            assert.equal(reused.statusCode, 400);
            assert.match(reused.body.error, /different from your current password/);

            const spoofed = response();
            await changePassword("student")({ user: { sub: account._id.toString() }, body: { currentPassword: "CurrentPass1", newPassword: "BrandNew1", tokenVersion: 99, role: "admin" } }, spoofed);
            assert.equal(spoofed.statusCode, 400);

            const ok = response();
            await changePassword("student")({ user: { sub: account._id.toString() }, body: { currentPassword: "CurrentPass1", newPassword: "BrandNew1" } }, ok);
            assert.equal(ok.statusCode, 200);
            assert.equal(saved, true);
            assert.equal(account.tokenVersion, 2, "other sessions must be revoked");
            assert.ok(account.passwordChangedAt instanceof Date);
            assert.equal(await bcrypt.compare("BrandNew1", account.password), true);
            // The caller keeps working through a freshly signed token carrying the new version.
            assert.equal(jwt.verify(ok.body.token, process.env.JWT_SECRET).tv, 2);
            assert.equal("password" in ok.body, false);
        } finally { User.findById = original; }
    });
});

test("password reset requests never reveal whether an account exists", async () => {
    const originalFind = User.findOne;
    const originalSend = emailDelivery.sendPasswordResetEmail;
    const bodies = [];
    try {
        // Unknown address.
        User.findOne = () => ({ select: async () => null });
        emailDelivery.sendPasswordResetEmail = async () => { throw new Error("must not send"); };
        const unknown = response();
        await requestPasswordReset("student")({ body: { email: "nobody@ruh.ac.lk" } }, unknown);
        bodies.push(unknown.body);
        assert.equal(unknown.statusCode, 200);

        // Known address.
        const account = student();
        account.save = async () => account;
        let deliveredTo;
        let deliveredToken;
        User.findOne = () => ({ select: async () => account });
        emailDelivery.sendPasswordResetEmail = async ({ recipient, token }) => { deliveredTo = recipient; deliveredToken = token; };
        const known = response();
        await requestPasswordReset("student")({ body: { email: "student@ruh.ac.lk" } }, known);
        bodies.push(known.body);
        assert.equal(deliveredTo, "student@ruh.ac.lk");
        assert.equal(isResetTokenFormatValid(deliveredToken), true);
        assert.equal(account.passwordResetTokenHash, hashResetToken(deliveredToken), "only the hash is stored");
        assert.notEqual(account.passwordResetTokenHash, deliveredToken);

        // Suspended account.
        const suspended = student({ moderationStatus: "suspended" });
        suspended.save = async () => suspended;
        User.findOne = () => ({ select: async () => suspended });
        emailDelivery.sendPasswordResetEmail = async () => { throw new Error("must not send"); };
        const blocked = response();
        await requestPasswordReset("student")({ body: { email: "student@ruh.ac.lk" } }, blocked);
        bodies.push(blocked.body);

        // Cooldown still active.
        const cooling = student();
        cooling.passwordResetRequestedAt = new Date();
        cooling.save = async () => cooling;
        User.findOne = () => ({ select: async () => cooling });
        const throttled = response();
        await requestPasswordReset("student")({ body: { email: "student@ruh.ac.lk" } }, throttled);
        bodies.push(throttled.body);
        assert.ok(getResetCooldownWaitSeconds(cooling) > 0);

        const [first, ...rest] = bodies;
        for (const body of rest) assert.deepEqual(body, first, "every outcome must share one generic body");
        assert.equal(JSON.stringify(first).toLowerCase().includes("exist"), true);
    } finally {
        User.findOne = originalFind;
        emailDelivery.sendPasswordResetEmail = originalSend;
    }
});

test("a reset token is single use, bounded, and revokes every issued token", async () => {
    const account = student({ tokenVersion: 5 });
    const rawToken = issueResetToken(account);
    assert.ok(account.passwordResetExpiresAt > new Date());
    account.save = async () => account;

    const originalFind = JobProvider.findOne;
    const originalUserFind = User.findOne;
    let capturedFilter;
    User.findOne = (filter) => { capturedFilter = filter; return { select: async () => account }; };
    try {
        const weak = response();
        await resetPassword("student")({ body: { token: rawToken, newPassword: "weak" } }, weak);
        assert.equal(weak.statusCode, 400);

        const spoofed = response();
        await resetPassword("student")({ body: { token: rawToken, newPassword: "BrandNew1", accountStatus: "approved" } }, spoofed);
        assert.equal(spoofed.statusCode, 400);

        const ok = response();
        await resetPassword("student")({ body: { token: rawToken, newPassword: "BrandNew1" } }, ok);
        assert.equal(ok.statusCode, 200);
        assert.equal(capturedFilter.passwordResetTokenHash, hashResetToken(rawToken), "lookup must use the hash");
        assert.ok(capturedFilter.passwordResetExpiresAt.$gt instanceof Date, "expiry must be enforced in the query");
        assert.equal(account.passwordResetTokenHash, undefined, "token must be consumed");
        assert.equal(account.tokenVersion, 6, "existing sessions must be revoked");
        assert.equal(await bcrypt.compare("BrandNew1", account.password), true);
        assert.equal("token" in ok.body, false, "reset must not return an access token");

        // A consumed or unknown token yields a generic invalid response.
        User.findOne = () => ({ select: async () => null });
        const replayed = response();
        await resetPassword("student")({ body: { token: rawToken, newPassword: "BrandNew1" } }, replayed);
        assert.equal(replayed.statusCode, 400);
        assert.equal(replayed.body.code, "RESET_TOKEN_INVALID");

        for (const token of [undefined, "not-hex", "a".repeat(63)]) {
            assert.equal(isResetTokenFormatValid(token), false);
        }
    } finally { User.findOne = originalUserFind; JobProvider.findOne = originalFind; }
});

test("logout revokes every issued session token", async () => {
    const account = provider({ tokenVersion: 0 });
    let saved = false;
    account.save = async () => { saved = true; return account; };
    const original = JobProvider.findById;
    JobProvider.findById = async () => account;
    try {
        const res = response();
        await logoutAllSessions("jobProvider")({ user: { sub: account._id.toString() } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(saved, true);
        assert.equal(account.tokenVersion, 1);
        assert.equal(isTokenVersionCurrent({ tv: 0 }, account), false);
    } finally { JobProvider.findById = original; }
});

test("revokeIssuedTokens and clearResetToken behave idempotently", () => {
    const account = student({ tokenVersion: 0 });
    revokeIssuedTokens(account);
    revokeIssuedTokens(account);
    assert.equal(account.tokenVersion, 2);
    issueResetToken(account);
    clearResetToken(account);
    assert.equal(account.passwordResetTokenHash, undefined);
    assert.equal(account.passwordResetExpiresAt, undefined);
});

test("the health endpoint reports coarse state only and fails closed when the database is down", () => {
    const res = response();
    getHealth({}, res);
    assert.equal(res.statusCode, mongoose.connection.readyState === 1 ? 200 : 503);
    assert.ok(["ok", "degraded"].includes(res.body.status));
    assert.equal(typeof res.body.uptimeSeconds, "number");
    assert.equal(typeof res.body.emailConfigured, "boolean");
    for (const leaked of ["uri", "host", "password", "version", "secret"]) {
        assert.equal(Object.keys(res.body).some((key) => key.toLowerCase().includes(leaked)), false, leaked);
    }
});

test("Phase 10 password and session routes exist with the intended role boundaries", () => {
    for (const router of [userRouter, jobProviderRouter]) {
        assert.ok(routeExists(router, "post", "/password/forgot"));
        assert.ok(routeExists(router, "post", "/password/reset"));
        assert.ok(routeExists(router, "patch", "/password"));
        assert.ok(routeExists(router, "post", "/logout"));
    }
    // Admin accounts are provisioned privately: change and logout only, never a public reset.
    assert.ok(routeExists(adminRouter, "patch", "/password"));
    assert.ok(routeExists(adminRouter, "post", "/logout"));
    assert.equal(routeExists(adminRouter, "post", "/password/forgot"), false);
    assert.equal(routeExists(adminRouter, "post", "/password/reset"), false);
});
