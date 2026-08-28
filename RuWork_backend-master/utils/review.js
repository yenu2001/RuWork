export const REVIEW_DEFAULT_LIMIT = 10;
export const REVIEW_MAX_LIMIT = 50;

export class ReviewInputError extends Error {}
export class ReviewConflictError extends Error {}

export function reviewPagination(query = {}, defaultLimit = REVIEW_DEFAULT_LIMIT) {
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? defaultLimit : Number(query.limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > REVIEW_MAX_LIMIT) {
        throw new ReviewInputError(`Pagination requires positive integers and a limit no greater than ${REVIEW_MAX_LIMIT}`);
    }
    return { page, limit };
}

export function reviewRating(value, { optional = false } = {}) {
    if (optional && (value === undefined || value === "")) return undefined;
    if (typeof value === "boolean" || value === null || value === "" || !Number.isInteger(Number(value))) {
        throw new ReviewInputError("Rating must be a whole number from 1 to 5");
    }
    const rating = Number(value);
    if (rating < 1 || rating > 5) throw new ReviewInputError("Rating must be a whole number from 1 to 5");
    return rating;
}

export function reviewComment(value) {
    if (value === undefined || value === null || value === "") return "";
    if (typeof value !== "string") throw new ReviewInputError("Review comment must be text");
    const comment = value.trim();
    if (comment.length > 1000) throw new ReviewInputError("Review comment must not exceed 1000 characters");
    return comment;
}

export function roundedRating(value) {
    return Math.round(Number(value) * 10) / 10;
}

export function escapeReviewSearch(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
