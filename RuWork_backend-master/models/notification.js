import mongoose from "mongoose";

const PARTICIPANT_TYPES = ["student", "jobProvider"];
const NOTIFICATION_TYPES = [
    "NEW_APPLICATION", "APPLICATION_ACCEPTED", "APPLICATION_DECLINED",
    "APPLICATION_WITHDRAWN", "APPLICATION_CANCELLED", "APPLICATION_COMPLETED", "NEW_MESSAGE"
];

const notificationSchema = new mongoose.Schema({
    recipientType: { type: String, enum: PARTICIPANT_TYPES, required: true, immutable: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true, immutable: true },
    message: { type: String, required: true, trim: true, maxlength: 500, immutable: true },
    relatedJobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null, immutable: true },
    relatedApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", default: null, immutable: true },
    relatedMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null, immutable: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null }
}, { timestamps: true });

notificationSchema.index({ recipientType: 1, recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, recipientId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
