import jwt from "jsonwebtoken";

export const STUDENT_ROLE = "student";
export const JOB_PROVIDER_ROLE = "Job_Provider";
export const ADMIN_ROLE = "admin";
export const UNIVERSITY_NAME = "University of Ruhuna";
export const ACCOUNT_STATUSES = ["pending", "approved", "rejected"];

export function normalizeEmail(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function getAllowedStudentEmailDomain() {
    return normalizeEmail(
        process.env.ALLOWED_STUDENT_EMAIL_DOMAIN || "ruh.ac.lk"
    ).replace(/^@/, "");
}

export function isAllowedStudentEmail(value) {
    const normalizedEmail = normalizeEmail(value);
    const emailParts = normalizedEmail.split("@");

    return emailParts.length === 2 &&
        emailParts[0].length > 0 &&
        !/\s/.test(normalizedEmail) &&
        emailParts[1] === getAllowedStudentEmailDomain();
}

export function hasBasicEmailFormat(value) {
    const normalizedEmail = normalizeEmail(value);
    const emailParts = normalizedEmail.split("@");

    return emailParts.length === 2 &&
        emailParts[0].length > 0 &&
        emailParts[1].length > 0 &&
        !/\s/.test(normalizedEmail);
}

export function getPasswordValidationError(password) {
    if (typeof password !== "string" || password.length < 8) {
        return "Password must contain at least 8 characters";
    }

    if (!/[A-Z]/.test(password)) {
        return "Password must contain at least one uppercase letter";
    }

    if (!/[0-9]/.test(password)) {
        return "Password must contain at least one number";
    }

    return null;
}

export function createAccessToken(account, email) {
    const jwtSecret = process.env.JWT_SECRET?.trim();

    if (!jwtSecret) {
        throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign({
        sub: account._id.toString(),
        firstName: account.firstName,
        lastName: account.lastName,
        email,
        role: account.role,
        // Phase 10 revocation claim: compared against the stored tokenVersion on every
        // authenticated request so a password change or logout invalidates issued tokens.
        tv: Number(account.tokenVersion || 0)
    }, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d"
    });
}

/**
 * A token is current only when its revocation claim matches the account's stored version. Tokens
 * issued before Phase 10 carry no claim and are treated as version 0, which matches the default
 * on existing accounts so no user is logged out by the upgrade itself.
 */
export function isTokenVersionCurrent(claims, account) {
    return Number(claims?.tv || 0) === Number(account?.tokenVersion || 0);
}
