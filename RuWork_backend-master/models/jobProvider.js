import mongoose from "mongoose";
import {
    ACCOUNT_STATUSES,
    JOB_PROVIDER_ROLE,
    hasBasicEmailFormat,
    normalizeEmail
} from "../utils/account.js";

const JobProviderSchema = new mongoose.Schema({

    //company information
    companyName: {
        type: String,
        required: true
    },
    companyEmail: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        set: normalizeEmail,
        validate: {
            validator: hasBasicEmailFormat,
            message: "A valid company email is required"
        }
    },
    phoneNumber: {
        type: String,
        required: true
    },
    companyAddress: {
        type: String,
        required: true,
        trim: true
    },
    companySize: {
        type: String,
        required: true
    },
    industry: {
        type: String,
        required: true
    },
    companyWebsite: {
        type: String,
        required: false
    },
    companyDescription: {
        type: String,
        required: true,
        maxlength: 300
    },
    averageRating: {
        type: Number,
        default: null,
        validate: {
            validator(value) {
                return value === null || (value >= 1 && value <= 5);
            },
            message: "Average rating must be between 1 and 5"
        }
    },
    reviewCount: {
        type: Number,
        default: 0,
        min: 0
    },

    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    role:{
        type: String,
        enum: [JOB_PROVIDER_ROLE],
        default: JOB_PROVIDER_ROLE,
        immutable: true
    },
    accountStatus: {
        type: String,
        enum: ACCOUNT_STATUSES,
        default: "pending"
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationTokenHash: {
        type: String,
        select: false
    },
    emailVerificationExpiresAt: {
        type: Date,
        select: false
    },
    verificationEmailSentAt: {
        type: Date,
        select: false
    },
    rejectionReason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    reviewedAt: {
        type: Date
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        select: false
    },
    moderationStatus: {
        type: String,
        enum: ["active", "suspended"],
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
    },
    password: {
        type: String,
        required: true
    },
    passwordResetTokenHash: {
        type: String,
        select: false
    },
    passwordResetExpiresAt: {
        type: Date,
        select: false
    },
    passwordResetRequestedAt: {
        type: Date,
        select: false
    },
    passwordChangedAt: {
        type: Date
    },
    tokenVersion: {
        type: Number,
        default: 0,
        min: 0
    }
}, { timestamps: true });

JobProviderSchema.index({ accountStatus: 1, moderationStatus: 1, createdAt: -1 });

const JobProvider = mongoose.model("JobProvider",JobProviderSchema);

export default JobProvider;
