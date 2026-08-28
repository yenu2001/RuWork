import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Application",
        required: true,
        immutable: true,
        unique: true
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        required: true,
        immutable: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true
    },
    jobProviderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobProvider",
        required: true,
        immutable: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: {
            validator: Number.isInteger,
            message: "Rating must be a whole number from 1 to 5"
        }
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ""
    },
    moderationStatus: {
        type: String,
        enum: ["active", "hidden"],
        default: "active"
    },
    moderationReason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    moderatedAt: Date,
    moderatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        select: false
    }
}, { timestamps: true });

reviewSchema.index({ jobId: 1, createdAt: -1 });
reviewSchema.index({ jobProviderId: 1, createdAt: -1 });
reviewSchema.index({ studentId: 1, createdAt: -1 });
reviewSchema.index({ rating: 1, createdAt: -1 });
reviewSchema.index({ moderationStatus: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
