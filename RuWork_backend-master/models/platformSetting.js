import mongoose from "mongoose";

const platformSettingSchema = new mongoose.Schema({
    singletonKey: { type: String, enum: ["platform"], default: "platform", unique: true, immutable: true },
    studentRegistrationOpen: { type: Boolean, default: true },
    providerRegistrationOpen: { type: Boolean, default: true },
    jobPostingOpen: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true }
}, { timestamps: true });

const PlatformSetting = mongoose.model("PlatformSetting", platformSettingSchema);
export default PlatformSetting;
