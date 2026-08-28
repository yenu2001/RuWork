import mongoose from "mongoose";
import {
    ACCOUNT_STATUSES,
    STUDENT_ROLE,
    UNIVERSITY_NAME,
    isAllowedStudentEmail,
    normalizeEmail
} from "../utils/account.js";

const userSchema = new mongoose.Schema({

    // Personal Information
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        set: normalizeEmail,
        validate: {
            validator: isAllowedStudentEmail,
            message: "Email must use the official University of Ruhuna domain"
        }
    },
    phoneNumber: {
        type: String,
        required: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Prefer not to say"],
        required: true
    }, 
    password: {
        type: String,
        required: true
    },
    university: {
        type: String,
        enum: [UNIVERSITY_NAME],
        default: UNIVERSITY_NAME,
        required: true,
        immutable: true
    },
    faculty: {
        type: String,
        trim: true
    },
    fieldOfStudy: {
        type: String,
        required: true,
        trim: true
    },
    yearOfStudy: {
        type: String,
        required: true,
        trim: true
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
    accountStatus: {
        type: String,
        enum: ACCOUNT_STATUSES,
        default: "pending"
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
    role: {
        type: String,
        enum: [STUDENT_ROLE],
        default: STUDENT_ROLE,
        immutable: true
    }

    }, { timestamps: true }

);

userSchema.index({ accountStatus: 1, moderationStatus: 1, createdAt: -1 });

const User = mongoose.model("User",userSchema);

export default User;
