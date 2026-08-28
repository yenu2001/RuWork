const MINIMUM_PRODUCTION_SECRET_LENGTH = 32;

function read(name) {
    const value = process.env[name];
    return typeof value === "string" ? value.trim() : "";
}

export function isProduction() {
    return read("NODE_ENV").toLowerCase() === "production";
}

/**
 * Phase 10 replaces the former `mongoose.connection.readyState === 0` short-circuit with this
 * explicit gate. Test support is now opt-in through the environment instead of being inferred
 * from a dropped connection, so a production outage can never silently take a test-only path.
 */
export function isTestEnvironment() {
    if (isProduction()) return false;
    return read("NODE_ENV").toLowerCase() === "test" || read("RUWORK_TEST_MODE").toLowerCase() === "true";
}

export function getPort() {
    const port = Number(read("PORT"));
    return Number.isInteger(port) && port > 0 && port < 65536 ? port : 5000;
}

export function getClientUrl() {
    return (read("CLIENT_URL") || "http://localhost:5173").replace(/\/$/, "");
}

/**
 * Browser origins allowed to call the API. `CORS_ORIGINS` accepts a comma-separated list and
 * falls back to the single configured client URL, so a deployment cannot accidentally run with
 * a permissive wildcard.
 */
export function getCorsOrigins() {
    const configured = read("CORS_ORIGINS");
    const origins = (configured ? configured.split(",") : [getClientUrl()])
        .map((origin) => origin.trim().replace(/\/$/, ""))
        .filter(Boolean);
    return [...new Set(origins)];
}

export function getJsonBodyLimit() {
    return read("JSON_BODY_LIMIT") || "100kb";
}

export function isRateLimitEnabled() {
    if (read("RATE_LIMIT_DISABLED").toLowerCase() === "true") return false;
    return !isTestEnvironment();
}

export function getTrustProxySetting() {
    const configured = read("TRUST_PROXY");
    if (!configured) return false;
    if (configured.toLowerCase() === "true") return 1;
    if (configured.toLowerCase() === "false") return false;
    const hops = Number(configured);
    return Number.isInteger(hops) && hops >= 0 ? hops : configured;
}

export function isEmailConfigured() {
    return Boolean(read("EMAIL_HOST") && read("EMAIL_USER") && read("EMAIL_PASSWORD") && read("EMAIL_FROM"));
}

/**
 * Fail-fast startup validation. Returns the list of problems rather than the offending values so
 * a misconfigured deployment never writes a secret into its own crash output.
 */
export function getEnvironmentProblems() {
    const problems = [];
    if (!read("MONGODB_URI")) problems.push("MONGODB_URI is not configured");
    if (!read("JWT_SECRET")) problems.push("JWT_SECRET is not configured");

    if (isProduction()) {
        if (read("JWT_SECRET").length < MINIMUM_PRODUCTION_SECRET_LENGTH) {
            problems.push(`JWT_SECRET must be at least ${MINIMUM_PRODUCTION_SECRET_LENGTH} characters in production`);
        }
        if (!read("CLIENT_URL") && !read("CORS_ORIGINS")) {
            problems.push("CLIENT_URL or CORS_ORIGINS must be configured in production");
        }
        if (getCorsOrigins().some((origin) => origin === "*")) {
            problems.push("CORS_ORIGINS must not contain a wildcard in production");
        }
        if (getCorsOrigins().some((origin) => !/^https?:\/\//i.test(origin))) {
            problems.push("Every configured CORS origin must include an http or https scheme");
        }
        if (!isEmailConfigured()) {
            problems.push("EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD, and EMAIL_FROM are required in production");
        }
        if (read("RUWORK_TEST_MODE").toLowerCase() === "true") {
            problems.push("RUWORK_TEST_MODE must not be enabled in production");
        }
    }

    return problems;
}

export function assertEnvironment() {
    const problems = getEnvironmentProblems();
    if (problems.length > 0) {
        throw new Error(`Invalid environment configuration:\n- ${problems.join("\n- ")}`);
    }
}
