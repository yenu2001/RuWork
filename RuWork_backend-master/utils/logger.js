import { isProduction, isTestEnvironment } from "./env.js";

/**
 * Keys whose values must never reach a log line. Matching is substring and case-insensitive so
 * `password`, `newPassword`, `emailVerificationTokenHash`, and `MONGODB_URI` are all covered.
 */
const REDACTED_KEY_PATTERNS = [
    "password", "token", "secret", "authorization", "auth", "cookie",
    "hash", "credential", "mongodb_uri", "mongodburi", "connectionstring", "apikey", "api_key"
];
const REDACTED = "[redacted]";
const MAX_DEPTH = 4;
const MAX_STRING = 500;

function isRedactedKey(key) {
    const normalized = String(key).toLowerCase();
    return REDACTED_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/**
 * Defence in depth for values that are not behind an obviously named key: anything shaped like a
 * JWT, a Mongo connection string, or a 32+ byte hex token is masked wherever it appears.
 */
function scrubString(value) {
    let scrubbed = value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
    scrubbed = scrubbed.replace(/\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, REDACTED);
    scrubbed = scrubbed.replace(/mongodb(\+srv)?:\/\/[^\s"']+/gi, REDACTED);
    scrubbed = scrubbed.replace(/\b[a-f0-9]{64,}\b/gi, REDACTED);
    return scrubbed;
}

export function redact(value, depth = 0) {
    if (value === null || value === undefined) return value;
    if (typeof value === "string") return scrubString(value);
    if (typeof value === "number" || typeof value === "boolean") return value;
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Error) return { name: value.name, message: scrubString(value.message) };
    if (depth >= MAX_DEPTH) return "[truncated]";
    if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
    if (typeof value === "object") {
        return Object.fromEntries(Object.entries(value).slice(0, 30).map(([key, item]) =>
            [key, isRedactedKey(key) ? REDACTED : redact(item, depth + 1)]));
    }
    return "[unloggable]";
}

function write(level, message, context) {
    if (isTestEnvironment()) return;
    const entry = { level, time: new Date().toISOString(), message: scrubString(String(message)) };
    const details = context ? redact(context) : undefined;
    if (details && Object.keys(details).length > 0) entry.context = details;
    const line = isProduction() ? JSON.stringify(entry) : `[${entry.level}] ${entry.message}${entry.context ? ` ${JSON.stringify(entry.context)}` : ""}`;
    if (level === "error") process.stderr.write(`${line}\n`);
    else process.stdout.write(`${line}\n`);
}

export const logger = {
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context)
};
