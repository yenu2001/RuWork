import mongoose from "mongoose";
import { APPLICATION_STATUSES } from "../utils/application.js";
import { JOB_BUDGET_TYPES } from "../utils/job.js";

const applicationSchema = new mongoose.Schema({
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
    applicationNote: {
        type: String,
        required: true,
        trim: true,
        minlength: 20,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: APPLICATION_STATUSES,
        default: "pending_review"
    },
    budgetType: {
        type: String,
        enum: JOB_BUDGET_TYPES,
        required: true,
        immutable: true
    },
    originalHourlyRate: {
        type: Number,
        min: 0.01,
        immutable: true
    },
    originalBudget: {
        type: Number,
        min: 0.01,
        immutable: true
    },
    approvedHourlyRate: {
        type: Number,
        min: 0.01
    },
    approvedBudget: {
        type: Number,
        min: 0.01
    },
    currency: {
        type: String,
        enum: ["LKR"],
        default: "LKR",
        immutable: true
    },
    declineReason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    cancellationReason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    appliedAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    acceptedAt: Date,
    declinedAt: Date,
    withdrawnAt: Date,
    cancelledAt: Date,
    completedAt: Date
}, { timestamps: true });

applicationSchema.pre("validate", function validateApplicationPricing() {
    const acceptedStatus = ["in_progress", "completed", "cancelled"].includes(this.status);
    if (this.budgetType === "hourly") {
        if (!Number.isFinite(this.originalHourlyRate) || this.originalHourlyRate <= 0) {
            this.invalidate("originalHourlyRate", "Hourly Applications require the original hourly rate");
        }
        this.originalBudget = undefined;
        this.approvedBudget = undefined;
        if (acceptedStatus && (!Number.isFinite(this.approvedHourlyRate) || this.approvedHourlyRate <= 0)) {
            this.invalidate("approvedHourlyRate", "Accepted hourly Applications require an approved hourly rate");
        }
    } else if (this.budgetType === "fixed") {
        if (!Number.isFinite(this.originalBudget) || this.originalBudget <= 0) {
            this.invalidate("originalBudget", "Fixed Applications require the original budget");
        }
        this.originalHourlyRate = undefined;
        this.approvedHourlyRate = undefined;
        if (acceptedStatus && (!Number.isFinite(this.approvedBudget) || this.approvedBudget <= 0)) {
            this.invalidate("approvedBudget", "Accepted fixed Applications require an approved budget");
        }
    }
});

applicationSchema.index({ jobId: 1, studentId: 1 }, { unique: true });
applicationSchema.index({ studentId: 1, status: 1, createdAt: -1 });
applicationSchema.index({ jobId: 1, status: 1, createdAt: -1 });
applicationSchema.index({ jobProviderId: 1, status: 1, createdAt: -1 });

const Application = mongoose.model("Application", applicationSchema);
export default Application;
