import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { getCorsOrigins, isProduction, isRateLimitEnabled } from "../utils/env.js";

/**
 * The API serves JSON only and never renders HTML, so the content policy can be maximally
 * restrictive. `crossOriginResourcePolicy` stays same-site because the browser client is served
 * from its own origin and talks to this API over the CORS allowlist below.
 */
export function securityHeaders() {
    return helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                "default-src": ["'none'"],
                "frame-ancestors": ["'none'"],
                "base-uri": ["'none'"],
                "form-action": ["'none'"]
            }
        },
        crossOriginResourcePolicy: { policy: "same-site" },
        referrerPolicy: { policy: "no-referrer" },
        hsts: isProduction() ? { maxAge: 31536000, includeSubDomains: true, preload: false } : false
    });
}

/**
 * Strict origin allowlist. Requests without an `Origin` header (server-to-server calls, health
 * probes, curl) are allowed through because CORS is a browser protection, not an authorization
 * boundary — authorization remains the JWT and role guards.
 */
export function corsPolicy() {
    const allowed = getCorsOrigins();
    return cors({
        origin(origin, callback) {
            if (!origin || allowed.includes(origin.replace(/\/$/, ""))) return callback(null, true);
            return callback(null, false);
        },
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: false,
        maxAge: 600
    });
}

function limiter({ windowMs, max, message, code, skipSuccessfulRequests = false }) {
    if (!isRateLimitEnabled()) return (req, res, next) => next();
    return rateLimit({
        windowMs,
        limit: max,
        skipSuccessfulRequests,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        // Health checks must stay available to orchestrators even under load.
        skip: (req) => req.path === "/health" || req.path === "/api/health",
        handler: (req, res) => res.status(429).json({ error: message, code })
    });
}

/** Broad protection against scripted traffic across the whole API. */
export const apiRateLimiter = limiter({
    windowMs: 15 * 60 * 1000,
    max: 600,
    message: "Too many requests. Please slow down and try again shortly.",
    code: "RATE_LIMITED"
});

/** Brute-force protection for credential checks. Successful logins are not counted. */
export const authRateLimiter = limiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true,
    message: "Too many authentication attempts. Please wait before trying again.",
    code: "AUTH_RATE_LIMITED"
});

/** Tighter still for endpoints that cause an email to be sent or an account to be created. */
export const sensitiveRateLimiter = limiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: "Too many requests for this operation. Please try again later.",
    code: "RATE_LIMITED"
});
