import mongoose from "mongoose";
import Job from "../models/job.js";
import JobProvider from "../models/jobProvider.js";
import Review from "../models/review.js";
import { roundedRating } from "./review.js";

async function ratingSummary(match) {
    const [summary] = await Review.aggregate([
        { $match: { ...match, moderationStatus: { $ne: "hidden" } } },
        { $group: { _id: null, averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } }
    ]);
    return summary
        ? { averageRating: roundedRating(summary.averageRating), reviewCount: summary.reviewCount }
        : { averageRating: null, reviewCount: 0 };
}

export async function recalculateJobRating(jobId) {
    const normalizedId = new mongoose.Types.ObjectId(jobId);
    const summary = await ratingSummary({ jobId: normalizedId });
    await Job.updateOne({ _id: normalizedId }, { $set: summary });
    return summary;
}

export async function recalculateProviderRating(jobProviderId) {
    const normalizedId = new mongoose.Types.ObjectId(jobProviderId);
    const summary = await ratingSummary({ jobProviderId: normalizedId });
    await JobProvider.updateOne({ _id: normalizedId }, { $set: summary });
    return summary;
}

export async function recalculateReviewAggregates(jobId, jobProviderId) {
    const [jobRating, providerRating] = await Promise.all([
        recalculateJobRating(jobId),
        recalculateProviderRating(jobProviderId)
    ]);
    return { jobRating, providerRating };
}
