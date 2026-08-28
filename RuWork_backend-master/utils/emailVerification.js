import crypto from "node:crypto";

const TOKEN_BYTES = 32;
const DEFAULT_EXPIRY_MINUTES = 30;
const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;
const PRIVATE_VERIFICATION_FIELDS = [
    "+emailVerificationTokenHash",
    "+emailVerificationExpiresAt",
    "+verificationEmailSentAt"
].join(" ");

function getPositiveNumber(value, fallback) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue > 0
        ? parsedValue
        : fallback;
}

export function getVerificationExpiryMinutes() {
    return getPositiveNumber(
        process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES,
        DEFAULT_EXPIRY_MINUTES
    );
}

export function getVerificationResendCooldownSeconds() {
    return getPositiveNumber(
        process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
        DEFAULT_RESEND_COOLDOWN_SECONDS
    );
}

export function hashVerificationToken(rawToken) {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function isVerificationTokenFormatValid(rawToken) {
    return typeof rawToken === "string" && /^[a-f0-9]{64}$/i.test(rawToken);
}

export function issueVerificationToken(account, now = new Date()) {
    const rawToken = crypto.randomBytes(TOKEN_BYTES).toString("hex");
    const expiryMilliseconds = getVerificationExpiryMinutes() * 60 * 1000;

    account.emailVerificationTokenHash = hashVerificationToken(rawToken);
    account.emailVerificationExpiresAt = new Date(now.getTime() + expiryMilliseconds);
    account.verificationEmailSentAt = now;

    return rawToken;
}

export function clearVerificationToken(account) {
    account.emailVerificationTokenHash = undefined;
    account.emailVerificationExpiresAt = undefined;
}

export function getVerificationResendWaitSeconds(account, now = new Date()) {
    if (!account.verificationEmailSentAt) {
        return 0;
    }

    const cooldownMilliseconds = getVerificationResendCooldownSeconds() * 1000;
    const availableAt = account.verificationEmailSentAt.getTime() + cooldownMilliseconds;
    return Math.max(0, Math.ceil((availableAt - now.getTime()) / 1000));
}

export async function allowImmediateVerificationRetry(account) {
    account.verificationEmailSentAt = undefined;
    await account.save();
}

export async function findVerificationAccount(Model, rawToken, now = new Date()) {
    if (!isVerificationTokenFormatValid(rawToken)) {
        return null;
    }

    return Model.findOne({
        emailVerificationTokenHash: hashVerificationToken(rawToken),
        emailVerificationExpiresAt: { $gt: now }
    }).select(PRIVATE_VERIFICATION_FIELDS);
}

export async function findAccountForVerificationResend(Model, query) {
    return Model.findOne(query).select(PRIVATE_VERIFICATION_FIELDS);
}

export { PRIVATE_VERIFICATION_FIELDS };
