import mongoose from "mongoose";

const PARTICIPANT_TYPES = ["student", "jobProvider"];

const messageSchema = new mongoose.Schema({
    senderType: { type: String, enum: PARTICIPANT_TYPES, required: true, immutable: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
    receiverType: { type: String, enum: PARTICIPANT_TYPES, required: true, immutable: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, immutable: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, immutable: true },
    content: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
    sharedContactNumber: { type: String, trim: true, maxlength: 40, default: null, immutable: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null }
}, { timestamps: true });

messageSchema.index({ applicationId: 1, createdAt: -1 });
messageSchema.index({ receiverType: 1, receiverId: 1, isRead: 1, createdAt: -1 });
messageSchema.index({ senderType: 1, senderId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
