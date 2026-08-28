import mongoose from "mongoose";
import {
    JOB_BUDGET_TYPES,
    JOB_CATEGORIES,
    JOB_STATUSES,
    JOB_SUITABLE_YEARS,
    normalizeSkills
} from "../utils/job.js";

const jobSchema = new mongoose.Schema({
    jobProviderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobProvider",
        required: true,
        immutable: true
    },
    jobTitle: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    companyName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160
    },
    jobDescription: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    category: {
        type: String,
        enum: JOB_CATEGORIES,
        required: true
    },
    scope: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    location: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160
    },
    budgetType: {
        type: String,
        enum: JOB_BUDGET_TYPES,
        required: true,
        lowercase: true
    },
    hourlyRate: {
        type: Number,
        min: [0.01, "Hourly rate must be greater than zero"]
    },
    budget: {
        type: Number,
        min: [0.01, "Fixed budget must be greater than zero"]
    },
    priceAmount: {
        type: Number,
        required: true,
        min: 0.01,
        select: false
    },
    currency: {
        type: String,
        enum: ["LKR"],
        default: "LKR",
        immutable: true
    },
    workingHours: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160
    },
    requiredSkills: {
        type: [String],
        required: true,
        set: normalizeSkills,
        validate: {
            validator(skills) {
                return Array.isArray(skills) && skills.length >= 1 && skills.length <= 10 &&
                    skills.every((skill) => skill.length <= 50);
            },
            message: "Provide between 1 and 10 unique skills, each no longer than 50 characters"
        }
    },
    suitableFor: {
        type: String,
        enum: JOB_SUITABLE_YEARS,
        default: "Any Year"
    },
    applicationDeadline: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: JOB_STATUSES,
        default: "open",
        lowercase: true
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
    archivedAt: {
        type: Date,
        default: null
    },
    moderationStatus: {
        type: String,
        enum: ["visible", "hidden"],
        default: "visible"
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
    providerSuspendedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

jobSchema.pre("validate", function validatePricing() {
    if (this.budgetType === "hourly") {
        if (!Number.isFinite(this.hourlyRate) || this.hourlyRate <= 0) {
            this.invalidate("hourlyRate", "Hourly jobs require an hourly rate greater than zero");
        }
        this.budget = undefined;
        this.priceAmount = this.hourlyRate;
    } else if (this.budgetType === "fixed") {
        if (!Number.isFinite(this.budget) || this.budget <= 0) {
            this.invalidate("budget", "Fixed jobs require a budget greater than zero");
        }
        this.hourlyRate = undefined;
        this.priceAmount = this.budget;
    }
});

jobSchema.index({ archivedAt: 1, status: 1, applicationDeadline: 1, createdAt: -1 });
jobSchema.index({ jobProviderId: 1, archivedAt: 1, status: 1, createdAt: -1 });
jobSchema.index({ moderationStatus: 1, providerSuspendedAt: 1, archivedAt: 1, status: 1, createdAt: -1 });
jobSchema.index({ category: 1, status: 1 });
jobSchema.index({ location: 1, status: 1 });
jobSchema.index({ status: 1, priceAmount: 1 });
jobSchema.index({
    jobTitle: "text",
    jobDescription: "text",
    companyName: "text",
    requiredSkills: "text"
});

const Job = mongoose.model("Job", jobSchema);
export default Job;
