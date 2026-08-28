import mongoose from "mongoose";

const ACTIONS = [
    "REGISTRATION_APPROVED", "REGISTRATION_REJECTED",
    "STUDENT_SUSPENDED", "STUDENT_RESTORED",
    "PROVIDER_SUSPENDED", "PROVIDER_RESTORED",
    "JOB_HIDDEN", "JOB_RESTORED",
    "REVIEW_HIDDEN", "REVIEW_RESTORED", "REVIEW_DELETED",
    "SETTINGS_UPDATED"
];
const ENTITY_TYPES = ["registration", "student", "jobProvider", "job", "review", "settings"];

const adminAuditSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true, immutable: true },
    action: { type: String, enum: ACTIONS, required: true, immutable: true },
    entityType: { type: String, enum: ENTITY_TYPES, required: true, immutable: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
        immutable: true,
        validate: {
            validator(value) {
                try { return JSON.stringify(value || {}).length <= 1500; } catch { return false; }
            },
            message: "Audit metadata is too large"
        }
    }
}, { timestamps: { createdAt: true, updatedAt: false } });

adminAuditSchema.index({ createdAt: -1 });
adminAuditSchema.index({ adminId: 1, createdAt: -1 });
adminAuditSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const AdminAudit = mongoose.model("AdminAudit", adminAuditSchema);
export default AdminAudit;
