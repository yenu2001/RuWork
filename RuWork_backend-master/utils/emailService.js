import nodemailer from "nodemailer";
import { getVerificationExpiryMinutes } from "./emailVerification.js";
import { getResetExpiryMinutes } from "./password.js";

let transporter;

function parseSecureSetting(value) {
    return String(value).trim().toLowerCase() === "true";
}

function getEmailConfiguration() {
    const configuration = {
        host: process.env.EMAIL_HOST?.trim(),
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: parseSecureSetting(process.env.EMAIL_SECURE || "false"),
        user: process.env.EMAIL_USER?.trim(),
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM?.trim()
    };

    const missingKeys = Object.entries(configuration)
        .filter(([key, value]) =>
            !["secure", "port"].includes(key) && !value
        )
        .map(([key]) => key);

    if (missingKeys.length > 0) {
        throw new Error("Email service is not configured");
    }

    return configuration;
}

function getTransporter() {
    if (!transporter) {
        const configuration = getEmailConfiguration();
        transporter = nodemailer.createTransport({
            host: configuration.host,
            port: configuration.port,
            secure: configuration.secure,
            auth: {
                user: configuration.user,
                pass: configuration.password
            }
        });
    }

    return transporter;
}

function getClientBaseUrl() {
    return (process.env.CLIENT_URL || "http://localhost:5173").trim().replace(/\/$/, "");
}

function buildVerificationUrl(token, accountType) {
    const query = new URLSearchParams({ token, type: accountType });
    return `${getClientBaseUrl()}/verify-email?${query.toString()}`;
}

function buildPasswordResetUrl(token, accountType) {
    const query = new URLSearchParams({ token, type: accountType });
    return `${getClientBaseUrl()}/reset-password?${query.toString()}`;
}

export const emailDelivery = {
    async sendVerificationEmail({ recipient, recipientName, token, accountType }) {
        const configuration = getEmailConfiguration();
        const verificationUrl = buildVerificationUrl(token, accountType);
        const expiryMinutes = getVerificationExpiryMinutes();
        const greetingName = recipientName?.trim() || "RuWork user";

        await getTransporter().sendMail({
            from: configuration.from,
            to: recipient,
            subject: "Verify your RuWork email address",
            text: [
                `Hello ${greetingName},`,
                "",
                "An account is being registered with RuWork using this email address.",
                `Verify your email by opening this link: ${verificationUrl}`,
                "",
                `This verification link expires in ${expiryMinutes} minutes and can be used only once.`,
                "If you did not register for RuWork, you may safely ignore this email."
            ].join("\n")
        });
    },

    async sendPasswordResetEmail({ recipient, recipientName, token, accountType }) {
        const configuration = getEmailConfiguration();
        const resetUrl = buildPasswordResetUrl(token, accountType);
        const expiryMinutes = getResetExpiryMinutes();
        const greetingName = recipientName?.trim() || "RuWork user";

        await getTransporter().sendMail({
            from: configuration.from,
            to: recipient,
            subject: "Reset your RuWork password",
            text: [
                `Hello ${greetingName},`,
                "",
                "A password reset was requested for your RuWork account.",
                `Reset your password by opening this link: ${resetUrl}`,
                "",
                `This link expires in ${expiryMinutes} minutes and can be used only once.`,
                "Resetting your password signs out every existing RuWork session.",
                "If you did not request this, you may safely ignore this email and your password will remain unchanged."
            ].join("\n")
        });
    }
};

export { buildVerificationUrl, buildPasswordResetUrl };
