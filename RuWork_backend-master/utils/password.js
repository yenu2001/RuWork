import crypto from "node:crypto";

const TOKEN_BYTES = 32;
const DEFAULT_RESET_EXPIRY_MINUTES = 30;
const DEFAULT_RESET_COOLDOWN_SECONDS = 60;
export const PRIVATE_RESET_FIELDS = [
    "+passwordResetTokenHash",
    "+passwordResetExpiresAt",
    "+passwordResetRequestedAt"
].join(" ");

function positiveNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getResetExpiryMinutes() {
    return positiveNumber(process.env.PASSWORD_RESET_EXPIRES_MINUTES, DEFAULT_RESET_EXPIRY_MINUTES);
}

export function getResetCooldownSeconds() {
    return positiveNumber(process.env.PASSWORD_RESET_COOLDOWN_SECONDS, DEFAULT_RESET_COOLDOWN_SECONDS);
}

export function hashResetToken(rawToken) {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function isResetTokenFormatValid(rawToken) {
    return typeof rawToken === "string" && /^[a-f0-9]{64}$/i.test(rawToken);
}

/**
 * Mirrors the Phase 2 email-verification design: the raw token is returned once for delivery and
 * only its SHA-256 hash is persisted, with a bounded expiry.
 */
export function issueResetToken(account, now = new Date()) {
    const rawToken = crypto.randomBytes(TOKEN_BYTES).toString("hex");
    account.passwordResetTokenHash = hashResetToken(rawToken);
    account.passwordResetExpiresAt = new Date(now.getTime() + getResetExpiryMinutes() * 60 * 1000);
    account.passwordResetRequestedAt = now;
    return rawToken;
}

export function clearResetToken(account) {
    account.passwordResetTokenHash = undefined;
    account.passwordResetExpiresAt = undefined;
}

export function getResetCooldownWaitSeconds(account, now = new Date()) {
    if (!account?.passwordResetRequestedAt) return 0;
    const availableAt = account.passwordResetRequestedAt.getTime() + getResetCooldownSeconds() * 1000;
    return Math.max(0, Math.ceil((availableAt - now.getTime()) / 1000));
}

export async function findAccountByResetToken(Model, rawToken, now = new Date()) {
    if (!isResetTokenFormatValid(rawToken)) return null;
    return Model.findOne({
        passwordResetTokenHash: hashResetToken(rawToken),
        passwordResetExpiresAt: { $gt: now }
    }).select(PRIVATE_RESET_FIELDS);
}

/**
 * Invalidates every access token already issued for this account. The `tv` claim embedded at
 * login is compared against this value on each authenticated request, so incrementing it logs
 * out all existing sessions.
 */
export function revokeIssuedTokens(account, now = new Date()) {
    account.tokenVersion = Number(account.tokenVersion || 0) + 1;
    account.passwordChangedAt = now;
    return account.tokenVersion;
}
