import mongoose from "mongoose";
import AdminAudit from "../models/adminAudit.js";
import PlatformSetting from "../models/platformSetting.js";

export const ACCOUNT_MODERATION_STATUSES = ["active", "suspended"];
export const CONTENT_MODERATION_STATUSES = ["visible", "hidden"];
export const REVIEW_MODERATION_STATUSES = ["active", "hidden"];
export const AUDIT_ACTIONS = [
    "REGISTRATION_APPROVED", "REGISTRATION_REJECTED",
    "STUDENT_SUSPENDED", "STUDENT_RESTORED",
    "PROVIDER_SUSPENDED", "PROVIDER_RESTORED",
    "JOB_HIDDEN", "JOB_RESTORED",
    "REVIEW_HIDDEN", "REVIEW_RESTORED", "REVIEW_DELETED",
    "SETTINGS_UPDATED"
];
export const AUDIT_ENTITY_TYPES = ["registration", "student", "jobProvider", "job", "review", "settings"];
export const SETTINGS_DEFAULTS = Object.freeze({
    studentRegistrationOpen: true,
    providerRegistrationOpen: true,
    jobPostingOpen: true
});
export const SETTING_FIELDS = Object.keys(SETTINGS_DEFAULTS);

const originalAuditCreate = AdminAudit.create;
const originalSettingsFindOne = PlatformSetting.findOne;

export class AdminInputError extends Error {}

// Repeated query keys arrive as arrays and single-element arrays coerce through Number(),
// so pagination accepts only scalar input before any numeric check.
function paginationNumber(value, fallback) {
    if (value === undefined) return fallback;
    if (typeof value !== "string" && typeof value !== "number") return NaN;
    return Number(value);
}

export function adminPagination(query = {}, defaultLimit = 20, { maxPage = 10000 } = {}) {
    const page = paginationNumber(query.page, 1);
    const limit = paginationNumber(query.limit, defaultLimit);
    if (!Number.isInteger(page) || page < 1 || page > maxPage || !Number.isInteger(limit) || limit < 1 || limit > 50) {
        throw new AdminInputError(`Pagination requires a page from 1 to ${maxPage} and a limit from 1 to 50`);
    }
    return { page, limit };
}

export function boundedSearch(value, maximum = 80) {
    if (value === undefined || value === "") return "";
    if (typeof value !== "string") throw new AdminInputError("Search must be text");
    const search = value.trim().replace(/\s+/g, " ");
    if (search.length > maximum) throw new AdminInputError(`Search must not exceed ${maximum} characters`);
    return search;
}

export function escapeAdminRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function moderationReason(value, { required = false } = {}) {
    if (value === undefined || value === null || value === "") {
        if (required) throw new AdminInputError("A moderation reason is required");
        return undefined;
    }
    if (typeof value !== "string") throw new AdminInputError("Moderation reason must be text");
    const reason = value.trim().replace(/\s+/g, " ");
    if (required && reason.length < 5) throw new AdminInputError("Moderation reason must contain at least 5 characters");
    if (reason.length > 500) throw new AdminInputError("Moderation reason must not exceed 500 characters");
    return reason || undefined;
}

export function assertOnlyFields(body = {}, allowed = []) {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AdminInputError("Request body must be an object");
    const unexpected = Object.keys(body).find((field) => !allowed.includes(field));
    if (unexpected) throw new AdminInputError(`${unexpected} cannot be changed through this Admin operation`);
}

export async function createAdminAudit({ adminId, action, entityType, entityId, metadata = {} }) {
    if (!mongoose.isValidObjectId(adminId) || !mongoose.isValidObjectId(entityId)) {
        throw new Error("Authoritative audit identity is invalid");
    }
    if (!AUDIT_ACTIONS.includes(action) || !AUDIT_ENTITY_TYPES.includes(entityType)) {
        throw new Error("Authoritative audit classification is invalid");
    }
    if (mongoose.connection.readyState === 0 && AdminAudit.create === originalAuditCreate) return null;
    return AdminAudit.create({ adminId, action, entityType, entityId, metadata });
}

export async function getPlatformSettings() {
    if (mongoose.connection.readyState === 0 && PlatformSetting.findOne === originalSettingsFindOne) {
        return { ...SETTINGS_DEFAULTS };
    }
    const settings = await PlatformSetting.findOne({ singletonKey: "platform" }).lean().exec();
    return { ...SETTINGS_DEFAULTS, ...(settings || {}) };
}
