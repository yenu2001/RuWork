export const APPLICATION_STATUSES = [
    "pending_review",
    "in_progress",
    "completed",
    "declined",
    "withdrawn",
    "cancelled"
];

export const STUDENT_APPLICATION_FILTERS = ["all", ...APPLICATION_STATUSES];
export const PROVIDER_APPLICATION_FILTERS = ["all", ...APPLICATION_STATUSES];

const TRANSITIONS = {
    student: {
        pending_review: ["withdrawn"],
        in_progress: ["cancelled"]
    },
    provider: {
        pending_review: ["in_progress", "declined"],
        in_progress: ["completed"]
    }
};

export class ApplicationInputError extends Error {}
export class ApplicationConflictError extends Error {}

export function assertApplicationTransition(currentStatus, nextStatus, actor) {
    if (!APPLICATION_STATUSES.includes(nextStatus) || !TRANSITIONS[actor]?.[currentStatus]?.includes(nextStatus)) {
        throw new ApplicationConflictError(`Application cannot transition from ${currentStatus} to ${nextStatus}`);
    }
}

export function identifier(value) {
    if (typeof value === "string") return value;
    if (typeof value?.toHexString === "function") return value.toHexString();
    if (value?._id && value._id !== value) return identifier(value._id);
    return value?.toString?.();
}

export function positivePrice(value, label) {
    const price = Number(value);
    if (!Number.isFinite(price) || price <= 0) {
        throw new ApplicationInputError(`${label} must be a positive number`);
    }
    return price;
}

export function normalizedNote(value, label, { required = false, maximum = 1000 } = {}) {
    if (value === undefined || value === null || value === "") {
        if (required) throw new ApplicationInputError(`${label} is required`);
        return undefined;
    }
    if (typeof value !== "string") throw new ApplicationInputError(`${label} must be text`);
    const note = value.trim();
    if (required && !note) throw new ApplicationInputError(`${label} is required`);
    if (note.length > maximum) throw new ApplicationInputError(`${label} must be no longer than ${maximum} characters`);
    return note || undefined;
}
