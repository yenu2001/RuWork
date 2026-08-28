import mongoose from "mongoose";
import { isEmailConfigured } from "../utils/env.js";

const CONNECTION_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

/**
 * Liveness and readiness probe. It reports only coarse operational state — never a connection
 * string, credential, host name, or version — and answers 503 when the database is not usable so
 * an orchestrator can take the instance out of rotation.
 */
export function getHealth(req, res) {
    const state = CONNECTION_STATES[mongoose.connection.readyState] || "unknown";
    const databaseReady = mongoose.connection.readyState === 1;
    return res.status(databaseReady ? 200 : 503).json({
        status: databaseReady ? "ok" : "degraded",
        uptimeSeconds: Math.round(process.uptime()),
        database: state,
        emailConfigured: isEmailConfigured(),
        time: new Date().toISOString()
    });
}
