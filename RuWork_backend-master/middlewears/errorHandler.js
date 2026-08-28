import crypto from "node:crypto";
import { isProduction } from "../utils/env.js";
import { logger } from "../utils/logger.js";

/**
 * Rejects request bodies that parsed into something other than a plain JSON object before any
 * controller sees them. Without this a JSON array or bare string reaches `Object.hasOwn` style
 * checks and behaves unpredictably.
 */
export function requireObjectBody(req, res, next) {
    if (["POST", "PATCH", "PUT"].includes(req.method) && req.body !== undefined) {
        const invalid = req.body === null || typeof req.body !== "object" || Array.isArray(req.body);
        if (invalid) return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    return next();
}

export function notFoundHandler(req, res) {
    return res.status(404).json({ error: "The requested resource was not found", code: "NOT_FOUND" });
}

function classify(error) {
    if (error?.type === "entity.parse.failed" || error instanceof SyntaxError) {
        return { status: 400, body: { error: "Request body is not valid JSON", code: "INVALID_JSON" } };
    }
    if (error?.type === "entity.too.large") {
        return { status: 413, body: { error: "Request body is too large", code: "PAYLOAD_TOO_LARGE" } };
    }
    if (error?.name === "ValidationError") {
        const message = Object.values(error.errors || {})[0]?.message || "Submitted information is invalid";
        return { status: 400, body: { error: message } };
    }
    if (error?.name === "CastError") {
        return { status: 400, body: { error: "A supplied identifier is invalid" } };
    }
    if (error?.code === 11000) {
        return { status: 409, body: { error: "That record already exists" } };
    }
    return null;
}

/**
 * Terminal error handler. Client-caused failures return their specific reason; anything else
 * returns one generic message plus a correlation id, so internal details and stack traces never
 * reach a response in any environment.
 */
export function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);

    const known = classify(error);
    if (known) return res.status(known.status).json(known.body);

    const reference = crypto.randomUUID();
    logger.error("Unhandled request failure", {
        reference,
        method: req.method,
        path: req.path,
        name: error?.name,
        message: error?.message,
        stack: isProduction() ? undefined : error?.stack
    });
    return res.status(500).json({ error: "An unexpected server error occurred", code: "INTERNAL_ERROR", reference });
}
