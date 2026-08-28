import mongoose from "mongoose";
import Application from "../models/application.js";
import Job from "../models/job.js";
import Review from "../models/review.js";
import { identifier } from "../utils/application.js";
import { recalculateReviewAggregates } from "../utils/ratingAggregates.js";
import { createAdminAudit } from "../utils/admin.js";
import {
    ReviewConflictError,
    ReviewInputError,
    escapeReviewSearch,
    reviewComment,
    reviewPagination,
    reviewRating
} from "../utils/review.js";

const SYSTEM_FIELDS = [
    "studentId", "jobId", "jobProviderId", "status", "averageRating", "reviewCount",
    "createdAt", "updatedAt", "applicationStatus", "moderationStatus", "moderationReason",
    "moderatedAt", "moderatedBy"
];

function getObject(document) {
    return typeof document?.toObject === "function"
        ? document.toObject({ getters: false, virtuals: false })
        : document;
}

function populated(value, field) {
    const object = getObject(value);
    return object && typeof object === "object" && object[field] !== undefined ? object : null;
}

export function serializeReview(document, { includeContext = false, includeModeration = false } = {}) {
    const review = getObject(document);
    const student = populated(review.studentId, "firstName");
    const job = populated(review.jobId, "jobTitle");
    const provider = populated(review.jobProviderId, "companyName");
    return {
        id: identifier(review._id || review.id),
        applicationId: identifier(review.applicationId),
        rating: review.rating,
        comment: review.comment || "",
        student: student ? { id: identifier(student._id || student.id), firstName: student.firstName, lastName: student.lastName } : undefined,
        ...(includeContext ? {
            job: job ? { id: identifier(job._id || job.id), jobTitle: job.jobTitle, isArchived: Boolean(job.archivedAt) } : undefined,
            provider: provider ? { id: identifier(provider._id || provider.id), companyName: provider.companyName } : undefined
        } : {}),
        ...(includeModeration ? {
            moderationStatus: review.moderationStatus || "active",
            moderationReason: review.moderationReason,
            moderatedAt: review.moderatedAt
        } : {}),
        createdAt: review.createdAt,
        updatedAt: review.updatedAt
    };
}

function assertNoSystemFields(body = {}) {
    const field = SYSTEM_FIELDS.find((name) => Object.hasOwn(body, name));
    if (field) throw new ReviewInputError(`${field} cannot be set by the client`);
}

function sendReviewError(res, error, fallback) {
    if (error?.code === 11000) {
        return res.status(409).json({ error: "This completed engagement already has a Review", code: "REVIEW_ALREADY_EXISTS" });
    }
    if (error instanceof ReviewConflictError) {
        return res.status(409).json({ error: error.message, code: error.code || "REVIEW_NOT_ELIGIBLE" });
    }
    if (error instanceof ReviewInputError || error?.name === "CastError") return res.status(400).json({ error: error.message });
    if (error?.name === "ValidationError") {
        return res.status(400).json({ error: Object.values(error.errors || {})[0]?.message || "Review information is invalid" });
    }
    return res.status(500).json({ error: fallback });
}

async function rollbackCreatedReview(review) {
    await Review.deleteOne({ _id: review._id }).catch(() => {});
    await recalculateReviewAggregates(review.jobId, review.jobProviderId).catch(() => {});
}

async function deleteReviewAndRecalculate(review) {
    const snapshot = getObject(review);
    await Review.deleteOne({ _id: review._id });
    try {
        return await recalculateReviewAggregates(review.jobId, review.jobProviderId);
    } catch (error) {
        await Review.create(snapshot).catch(() => {});
        await recalculateReviewAggregates(review.jobId, review.jobProviderId).catch(() => {});
        throw error;
    }
}

export async function createReview(req, res) {
    let review;
    try {
        assertNoSystemFields(req.body);
        if (!mongoose.isValidObjectId(req.body?.applicationId)) throw new ReviewInputError("A valid completed Application is required");
        const application = await Application.findById(req.body.applicationId);
        if (!application) return res.status(404).json({ error: "Application not found" });
        if (identifier(application.studentId) !== identifier(req.studentAccount._id)) {
            return res.status(403).json({ error: "You may Review only your own completed engagement" });
        }
        if (application.status !== "completed") throw new ReviewConflictError("Only completed Applications are Review eligible");
        const job = await Job.findById(application.jobId).select("jobProviderId").lean().exec();
        if (!job || identifier(job.jobProviderId) !== identifier(application.jobProviderId)) {
            throw new ReviewConflictError("The completed engagement has inconsistent Job ownership");
        }
        if (await Review.exists({ applicationId: application._id })) {
            const duplicate = new ReviewConflictError("This completed engagement already has a Review");
            duplicate.code = "REVIEW_ALREADY_EXISTS";
            throw duplicate;
        }
        review = new Review({
            applicationId: application._id,
            jobId: application.jobId,
            studentId: application.studentId,
            jobProviderId: application.jobProviderId,
            rating: reviewRating(req.body.rating),
            comment: reviewComment(req.body.comment)
        });
        await review.save();
        let aggregates;
        try {
            aggregates = await recalculateReviewAggregates(review.jobId, review.jobProviderId);
        } catch (error) {
            await rollbackCreatedReview(review);
            throw error;
        }
        await review.populate({ path: "studentId", select: "firstName lastName" });
        return res.status(201).json({ message: "Review submitted successfully", review: serializeReview(review), ...aggregates });
    } catch (error) {
        return sendReviewError(res, error, "Review creation failed");
    }
}

export async function getMyReviewForApplication(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.applicationId)) return res.status(404).json({ error: "Application not found" });
        const application = await Application.findById(req.params.applicationId).select("studentId").lean().exec();
        if (!application) return res.status(404).json({ error: "Application not found" });
        if (identifier(application.studentId) !== identifier(req.studentAccount._id)) return res.status(403).json({ error: "You may view only your own Review" });
        const review = await Review.findOne({ applicationId: application._id }).populate({ path: "studentId", select: "firstName lastName" }).lean().exec();
        return res.json({ review: review ? serializeReview(review) : null });
    } catch (error) {
        return res.status(500).json({ error: "Review lookup failed" });
    }
}

export async function deleteMyReview(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Review not found" });
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ error: "Review not found" });
        if (identifier(review.studentId) !== identifier(req.studentAccount._id)) return res.status(403).json({ error: "You may delete only your own Review" });
        const aggregates = await deleteReviewAndRecalculate(review);
        return res.json({ message: "Review deleted successfully", ...aggregates });
    } catch (error) {
        return sendReviewError(res, error, "Review deletion failed");
    }
}

export async function listJobReviews(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(404).json({ error: "Job not found" });
        const { page, limit } = reviewPagination(req.query);
        const filter = { jobId: new mongoose.Types.ObjectId(req.params.jobId), moderationStatus: { $ne: "hidden" } };
        const [reviews, total] = await Promise.all([
            Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
                .populate({ path: "studentId", select: "firstName lastName" }).lean().exec(),
            Review.countDocuments(filter)
        ]);
        return res.json({ reviews: reviews.map((review) => serializeReview(review)), pagination: { page, limit, total, pages: total ? Math.ceil(total / limit) : 0 } });
    } catch (error) {
        return sendReviewError(res, error, "Job Reviews loading failed");
    }
}

export async function listProviderReviews(req, res) {
    try {
        const { page, limit } = reviewPagination(req.query, 12);
        const filter = { jobProviderId: req.jobProviderAccount._id, moderationStatus: { $ne: "hidden" } };
        const [reviews, total] = await Promise.all([
            Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
                .populate({ path: "studentId", select: "firstName lastName" })
                .populate({ path: "jobId", select: "jobTitle archivedAt" }).lean().exec(),
            Review.countDocuments(filter)
        ]);
        return res.json({
            summary: { averageRating: req.jobProviderAccount.averageRating ?? null, reviewCount: req.jobProviderAccount.reviewCount || 0 },
            reviews: reviews.map((review) => serializeReview(review, { includeContext: true })),
            pagination: { page, limit, total, pages: total ? Math.ceil(total / limit) : 0 }
        });
    } catch (error) {
        return sendReviewError(res, error, "Provider Reviews loading failed");
    }
}

export async function listAdminReviews(req, res) {
    try {
        const { page, limit } = reviewPagination(req.query, 20);
        const filter = {};
        const moderationStatus = req.query?.moderationStatus || "all";
        if (!["all", "active", "hidden"].includes(moderationStatus)) throw new ReviewInputError("Invalid Review moderation filter");
        if (moderationStatus === "active") filter.moderationStatus = { $ne: "hidden" };
        if (moderationStatus === "hidden") filter.moderationStatus = "hidden";
        const rating = reviewRating(req.query?.rating, { optional: true });
        if (rating !== undefined) filter.rating = rating;
        if (req.query?.q) {
            if (typeof req.query.q !== "string" || req.query.q.trim().length > 80) throw new ReviewInputError("Review search must be text no longer than 80 characters");
            filter.comment = { $regex: escapeReviewSearch(req.query.q.trim()), $options: "i" };
        }
        const [reviews, total] = await Promise.all([
            Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
                .populate({ path: "studentId", select: "firstName lastName" })
                .populate({ path: "jobId", select: "jobTitle archivedAt" })
                .populate({ path: "jobProviderId", select: "companyName" }).lean().exec(),
            Review.countDocuments(filter)
        ]);
        return res.json({ reviews: reviews.map((review) => serializeReview(review, { includeContext: true, includeModeration: true })), pagination: { page, limit, total, pages: total ? Math.ceil(total / limit) : 0 } });
    } catch (error) {
        return sendReviewError(res, error, "Admin Reviews loading failed");
    }
}

export async function deleteReviewAsAdmin(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Review not found" });
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ error: "Review not found" });
        const snapshot = getObject(review);
        const aggregates = await deleteReviewAndRecalculate(review);
        if (req.user?.sub) {
            try {
                await createAdminAudit({
                    adminId: req.user.sub,
                    action: "REVIEW_DELETED",
                    entityType: "review",
                    entityId: review._id,
                    metadata: { applicationId: identifier(review.applicationId) }
                });
            } catch (error) {
                await Review.create(snapshot).catch(() => {});
                await recalculateReviewAggregates(review.jobId, review.jobProviderId).catch(() => {});
                throw error;
            }
        }
        return res.json({ message: "Review removed successfully", ...aggregates });
    } catch (error) {
        return sendReviewError(res, error, "Admin Review deletion failed");
    }
}
