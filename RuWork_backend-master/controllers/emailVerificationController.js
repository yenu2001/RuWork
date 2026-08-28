import JobProvider from "../models/jobProvider.js";
import User from "../models/user.js";
import {
    JOB_PROVIDER_ROLE,
    STUDENT_ROLE,
    hasBasicEmailFormat,
    isAllowedStudentEmail,
    normalizeEmail
} from "../utils/account.js";
import { emailDelivery } from "../utils/emailService.js";
import {
    allowImmediateVerificationRetry,
    clearVerificationToken,
    findAccountForVerificationResend,
    findVerificationAccount,
    getVerificationResendWaitSeconds,
    issueVerificationToken
} from "../utils/emailVerification.js";

const VERIFICATION_SPECS = {
    student: {
        Model: User,
        emailField: "email",
        role: STUDENT_ROLE,
        validateEmail: isAllowedStudentEmail,
        displayName(account) {
            return `${account.firstName} ${account.lastName}`;
        }
    },
    jobProvider: {
        Model: JobProvider,
        emailField: "companyEmail",
        role: JOB_PROVIDER_ROLE,
        validateEmail: hasBasicEmailFormat,
        displayName(account) {
            return account.companyName;
        }
    }
};

function genericResendResponse(res) {
    return res.json({
        message: "If an eligible unverified account exists, a verification email will be sent."
    });
}

function createVerifyHandler(accountType) {
    const specification = VERIFICATION_SPECS[accountType];

    return async function verifyEmail(req, res) {
        try {
            const account = await findVerificationAccount(
                specification.Model,
                req.params.token
            );

            if (!account || account.role !== specification.role) {
                return res.status(400).json({
                    error: "The verification link is invalid or has expired.",
                    code: "INVALID_OR_EXPIRED_VERIFICATION_TOKEN"
                });
            }

            account.isEmailVerified = true;
            clearVerificationToken(account);
            await account.save();

            return res.json({
                message: "Email verified successfully. The registration remains pending until Admin review.",
                isEmailVerified: true,
                accountStatus: account.accountStatus
            });
        } catch (error) {
            return res.status(500).json({ error: "Email verification failed" });
        }
    };
}

function createResendHandler(accountType) {
    const specification = VERIFICATION_SPECS[accountType];

    return async function resendVerification(req, res) {
        try {
            const email = normalizeEmail(req.body?.[specification.emailField]);

            if (!specification.validateEmail(email)) {
                return res.status(400).json({ error: "A valid email address is required" });
            }

            const account = await findAccountForVerificationResend(
                specification.Model,
                { [specification.emailField]: email }
            );

            if (!account ||
                account.role !== specification.role ||
                !specification.validateEmail(account[specification.emailField]) ||
                account.isEmailVerified) {
                return genericResendResponse(res);
            }

            const retryAfterSeconds = getVerificationResendWaitSeconds(account);
            if (retryAfterSeconds > 0) {
                res.set("Retry-After", String(retryAfterSeconds));
                return res.status(429).json({
                    error: "Please wait before requesting another verification email.",
                    code: "VERIFICATION_RESEND_COOLDOWN",
                    retryAfterSeconds
                });
            }

            const verificationToken = issueVerificationToken(account);
            await account.save();

            try {
                await emailDelivery.sendVerificationEmail({
                    recipient: account[specification.emailField],
                    recipientName: specification.displayName(account),
                    token: verificationToken,
                    accountType
                });
            } catch (error) {
                await allowImmediateVerificationRetry(account).catch(() => {});
                return res.status(503).json({
                    error: "The verification email could not be sent. Please try again later.",
                    code: "VERIFICATION_EMAIL_NOT_SENT"
                });
            }

            return genericResendResponse(res);
        } catch (error) {
            return res.status(500).json({ error: "Verification email request failed" });
        }
    };
}

export const verifyStudentEmail = createVerifyHandler("student");
export const resendStudentVerification = createResendHandler("student");
export const verifyJobProviderEmail = createVerifyHandler("jobProvider");
export const resendJobProviderVerification = createResendHandler("jobProvider");
