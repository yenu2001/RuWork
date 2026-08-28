import bcrypt from "bcrypt";
import Admin from "../models/admin.js";
import JobProvider from "../models/jobProvider.js";
import User from "../models/user.js";
import {
    ADMIN_ROLE,
    JOB_PROVIDER_ROLE,
    STUDENT_ROLE,
    createAccessToken,
    getPasswordValidationError,
    normalizeEmail
} from "../utils/account.js";
import { emailDelivery } from "../utils/emailService.js";
import {
    clearResetToken,
    findAccountByResetToken,
    getResetCooldownWaitSeconds,
    issueResetToken,
    revokeIssuedTokens,
    PRIVATE_RESET_FIELDS
} from "../utils/password.js";
import { logger } from "../utils/logger.js";

const BCRYPT_ROUNDS = 10;

/**
 * A single generic response for every forgot-password outcome. Returning the same body whether or
 * not an account exists prevents the endpoint from being used to enumerate registered emails.
 */
const GENERIC_RESET_RESPONSE = {
    message: "If an account exists for that address, a password reset link has been sent."
};

const ACCOUNT_TYPES = {
    student: {
        Model: User,
        role: STUDENT_ROLE,
        emailField: "email",
        label: "Student",
        resettable: true
    },
    jobProvider: {
        Model: JobProvider,
        role: JOB_PROVIDER_ROLE,
        emailField: "companyEmail",
        label: "Job Provider",
        resettable: true
    },
    // Admin accounts are provisioned privately, so no unauthenticated reset path is exposed.
    admin: {
        Model: Admin,
        role: ADMIN_ROLE,
        emailField: "email",
        label: "Admin",
        resettable: false
    }
};

function accountEmail(definition, account) {
    return account[definition.emailField];
}

/**
 * Authenticated password change. Requires the current password, rejects a no-op change, and
 * revokes every previously issued token before returning one freshly signed token so the caller's
 * own session survives while other sessions are ended.
 */
export function changePassword(accountType) {
    const definition = ACCOUNT_TYPES[accountType];
    return async function handleChangePassword(req, res) {
        try {
            const body = req.body || {};
            const allowed = ["currentPassword", "newPassword"];
            const unexpected = Object.keys(body).find((field) => !allowed.includes(field));
            if (unexpected) {
                return res.status(400).json({ error: `${unexpected} cannot be supplied when changing a password` });
            }
            if (typeof body.currentPassword !== "string" || typeof body.newPassword !== "string") {
                return res.status(400).json({ error: "Current password and new password are required" });
            }

            const account = await definition.Model.findById(req.user?.sub);
            if (!account) {
                return res.status(404).json({ error: `${definition.label} account was not found` });
            }

            const matches = await bcrypt.compare(body.currentPassword, account.password);
            if (!matches) {
                return res.status(401).json({ error: "Your current password is incorrect", code: "CURRENT_PASSWORD_INVALID" });
            }

            const passwordError = getPasswordValidationError(body.newPassword);
            if (passwordError) {
                return res.status(400).json({ error: passwordError });
            }
            if (await bcrypt.compare(body.newPassword, account.password)) {
                return res.status(400).json({ error: "Your new password must be different from your current password" });
            }

            account.password = await bcrypt.hash(body.newPassword, BCRYPT_ROUNDS);
            revokeIssuedTokens(account);
            await account.save();

            return res.json({
                message: "Password changed successfully. Other sessions have been signed out.",
                token: createAccessToken(account, accountEmail(definition, account))
            });
        } catch (error) {
            logger.error("Password change failed", { accountType, name: error?.name });
            return res.status(500).json({ error: "Password change failed" });
        }
    };
}

/**
 * Unauthenticated reset request. Always answers with the same generic body and never reveals
 * account state, verification state, approval state, or delivery failure.
 */
export function requestPasswordReset(accountType) {
    const definition = ACCOUNT_TYPES[accountType];
    return async function handleRequestPasswordReset(req, res) {
        try {
            const email = normalizeEmail((req.body || {})[definition.emailField] || (req.body || {}).email);
            if (!email) {
                return res.status(400).json({ error: "An email address is required" });
            }

            const account = await definition.Model
                .findOne({ [definition.emailField]: email })
                .select(PRIVATE_RESET_FIELDS);

            // Unknown address, suspended account, or an active cooldown all return the same body.
            if (!account || account.moderationStatus === "suspended" || getResetCooldownWaitSeconds(account) > 0) {
                return res.json(GENERIC_RESET_RESPONSE);
            }

            const rawToken = issueResetToken(account);
            await account.save();

            try {
                await emailDelivery.sendPasswordResetEmail({
                    recipient: accountEmail(definition, account),
                    recipientName: `${account.firstName || ""} ${account.lastName || ""}`.trim(),
                    token: rawToken,
                    accountType
                });
            } catch (error) {
                // Roll the token back so a failed send cannot leave an unusable window open,
                // but still answer generically so delivery state is not observable.
                clearResetToken(account);
                account.passwordResetRequestedAt = undefined;
                await account.save().catch(() => {});
                logger.error("Password reset email delivery failed", { accountType, name: error?.name });
            }

            return res.json(GENERIC_RESET_RESPONSE);
        } catch (error) {
            logger.error("Password reset request failed", { accountType, name: error?.name });
            return res.json(GENERIC_RESET_RESPONSE);
        }
    };
}

/** Consumes a single-use reset token, sets the new password, and revokes every issued token. */
export function resetPassword(accountType) {
    const definition = ACCOUNT_TYPES[accountType];
    return async function handleResetPassword(req, res) {
        try {
            const body = req.body || {};
            const allowed = ["token", "newPassword"];
            const unexpected = Object.keys(body).find((field) => !allowed.includes(field));
            if (unexpected) {
                return res.status(400).json({ error: `${unexpected} cannot be supplied when resetting a password` });
            }
            if (typeof body.newPassword !== "string") {
                return res.status(400).json({ error: "A new password is required" });
            }

            const passwordError = getPasswordValidationError(body.newPassword);
            if (passwordError) {
                return res.status(400).json({ error: passwordError });
            }

            const account = await findAccountByResetToken(definition.Model, body.token);
            if (!account) {
                return res.status(400).json({
                    error: "This password reset link is invalid or has expired.",
                    code: "RESET_TOKEN_INVALID"
                });
            }

            account.password = await bcrypt.hash(body.newPassword, BCRYPT_ROUNDS);
            clearResetToken(account);
            account.passwordResetRequestedAt = undefined;
            revokeIssuedTokens(account);
            await account.save();

            // No token is returned: the caller re-authenticates through the normal login rules,
            // which re-check verification, approval, and moderation state.
            return res.json({ message: "Password reset successfully. Please sign in with your new password." });
        } catch (error) {
            logger.error("Password reset failed", { accountType, name: error?.name });
            return res.status(500).json({ error: "Password reset failed" });
        }
    };
}

/** Ends every session for the authenticated account by advancing its revocation version. */
export function logoutAllSessions(accountType) {
    const definition = ACCOUNT_TYPES[accountType];
    return async function handleLogout(req, res) {
        try {
            const account = await definition.Model.findById(req.user?.sub);
            if (!account) {
                return res.status(404).json({ error: `${definition.label} account was not found` });
            }
            account.tokenVersion = Number(account.tokenVersion || 0) + 1;
            await account.save();
            return res.json({ message: "Signed out of all sessions successfully" });
        } catch (error) {
            logger.error("Logout failed", { accountType, name: error?.name });
            return res.status(500).json({ error: "Sign out failed" });
        }
    };
}

export { ACCOUNT_TYPES, GENERIC_RESET_RESPONSE };
