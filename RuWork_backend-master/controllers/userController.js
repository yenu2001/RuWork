import bcrypt from "bcrypt";
import Application from "../models/application.js";
import Job from "../models/job.js";
import User from "../models/user.js";
import { serializeApplication } from "./applicationController.js";
import { serializeJobSummary } from "./jobController.js";
import {
    STUDENT_ROLE,
    UNIVERSITY_NAME,
    createAccessToken,
    getPasswordValidationError,
    isAllowedStudentEmail,
    normalizeEmail
} from "../utils/account.js";
import { emailDelivery } from "../utils/emailService.js";
import {
    allowImmediateVerificationRetry,
    issueVerificationToken
} from "../utils/emailVerification.js";
import { getPlatformSettings } from "../utils/admin.js";

const STUDENT_PROFILE_FIELDS = [
    "firstName", "lastName", "phoneNumber", "dateOfBirth", "gender",
    "faculty", "fieldOfStudy", "yearOfStudy"
];
const STUDENT_PROTECTED_FIELDS = [
    "email", "university", "role", "accountStatus", "isEmailVerified",
    "password", "emailVerificationTokenHash", "emailVerificationExpiresAt",
    "verificationEmailSentAt", "reviewedAt", "reviewedBy", "rejectionReason",
    "moderationStatus", "moderationReason", "moderatedAt", "moderatedBy"
];
const HISTORY_STATUSES = ["completed", "cancelled", "declined", "withdrawn"];

function studentIdentifier(req) {
    return req.studentAccount?._id;
}

export function serializeStudentProfile(student) {
    return {
        id: student._id.toString(),
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phoneNumber: student.phoneNumber,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        university: student.university,
        faculty: student.faculty || "",
        fieldOfStudy: student.fieldOfStudy,
        yearOfStudy: student.yearOfStudy,
        isEmailVerified: student.isEmailVerified,
        accountStatus: student.accountStatus,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt
    };
}

function studentProfilePayload(body = {}) {
    const protectedField = STUDENT_PROTECTED_FIELDS.find((field) => Object.hasOwn(body, field));
    if (protectedField) throw new Error(`${protectedField} cannot be changed through the profile`);
    const payload = {};
    for (const field of STUDENT_PROFILE_FIELDS) {
        if (!Object.hasOwn(body, field)) continue;
        payload[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
    }
    if (!Object.keys(payload).length) throw new Error("Provide at least one editable profile field");
    return payload;
}

function profileError(res, error, fallback) {
    if (error?.name === "ValidationError") {
        return res.status(400).json({ error: Object.values(error.errors || {})[0]?.message || "Profile information is invalid" });
    }
    if (error?.name === "CastError" || error?.message?.includes("cannot be changed") || error?.message?.startsWith("Provide at least")) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: fallback });
}

export async function registerUser(req, res) {
    try {
        const settings = await getPlatformSettings();
        if (!settings.studentRegistrationOpen) {
            return res.status(403).json({ error: "Student registration is currently closed", code: "REGISTRATION_CLOSED" });
        }
        const dataU = req.body || {};
        const email = normalizeEmail(dataU.email);
        const passwordError = getPasswordValidationError(dataU.password);

        if (!isAllowedStudentEmail(email)) {
            return res.status(400).json({
                error: "A valid University of Ruhuna email address is required"
            });
        }

        if (dataU.university &&
            (typeof dataU.university !== "string" ||
                dataU.university.trim() !== UNIVERSITY_NAME)) {
            return res.status(400).json({
                error: `University must be ${UNIVERSITY_NAME}`
            });
        }

        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        const hashedPassword = await bcrypt.hash(dataU.password, 10);
        const newUser = new User({
            firstName: dataU.firstName,
            lastName: dataU.lastName,
            email,
            phoneNumber: dataU.phoneNumber,
            dateOfBirth: dataU.dateOfBirth,
            gender: dataU.gender,
            password: hashedPassword,
            university: UNIVERSITY_NAME,
            faculty: dataU.faculty,
            fieldOfStudy: dataU.fieldOfStudy,
            yearOfStudy: dataU.yearOfStudy,
            isEmailVerified: false,
            accountStatus: "pending",
            role: STUDENT_ROLE
        });
        const verificationToken = issueVerificationToken(newUser);

        await newUser.save();

        try {
            await emailDelivery.sendVerificationEmail({
                recipient: newUser.email,
                recipientName: `${newUser.firstName} ${newUser.lastName}`,
                token: verificationToken,
                accountType: "student"
            });
        } catch (error) {
            await allowImmediateVerificationRetry(newUser).catch(() => {});
            return res.status(503).json({
                error: "Account created, but the verification email could not be sent. Please request another verification email.",
                code: "VERIFICATION_EMAIL_NOT_SENT"
            });
        }

        return res.status(201).json({
            message: "Student account submitted. Check your University email for the verification link, then await Admin approval.",
            accountStatus: newUser.accountStatus,
            isEmailVerified: newUser.isEmailVerified
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ error: "An account already uses this email" });
        }

        if (error?.name === "ValidationError") {
            return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({ error: "User registration failed" });
    }
}

export async function loginUser(req, res) {
    try {
        const dataU = req.body || {};
        const email = normalizeEmail(dataU.email);

        if (!email || typeof dataU.password !== "string") {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        const isPasswordCorrect = user &&
            await bcrypt.compare(dataU.password, user.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        if (user.role !== STUDENT_ROLE ||
            user.university !== UNIVERSITY_NAME ||
            !isAllowedStudentEmail(user.email)) {
            return res.status(403).json({
                error: "This account is not eligible for Student access",
                code: "STUDENT_NOT_ELIGIBLE"
            });
        }

        if (!user.isEmailVerified) {
            return res.status(403).json({
                error: "Please verify your University of Ruhuna email address before continuing.",
                code: "EMAIL_NOT_VERIFIED"
            });
        }

        if (user.accountStatus !== "approved") {
            const rejected = user.accountStatus === "rejected";
            return res.status(403).json({
                error: rejected
                    ? "Your registration was rejected by an administrator."
                    : "Your registration has been verified and is currently awaiting administrator approval.",
                code: rejected ? "ACCOUNT_REJECTED" : "ACCOUNT_PENDING"
            });
        }

        if (user.moderationStatus === "suspended") {
            return res.status(403).json({
                error: "This Student account has been suspended by an administrator.",
                code: "ACCOUNT_SUSPENDED"
            });
        }

        const token = createAccessToken(user, user.email);
        return res.json({ message: "Login successful", token });
    } catch (error) {
        return res.status(500).json({ error: "Login failed" });
    }
}

export function getMyProfile(req, res) {
    return res.json({ profile: serializeStudentProfile(req.studentAccount) });
}

export async function updateMyProfile(req, res) {
    try {
        Object.assign(req.studentAccount, studentProfilePayload(req.body));
        await req.studentAccount.save();
        return res.json({ message: "Student profile updated successfully", profile: serializeStudentProfile(req.studentAccount) });
    } catch (error) {
        return profileError(res, error, "Student profile update failed");
    }
}

export async function getStudentDashboard(req, res) {
    try {
        const studentId = studentIdentifier(req);
        const now = new Date();
        const [statusGroups, recentApplications, recentJobs] = await Promise.all([
            Application.aggregate([
                { $match: { studentId } },
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),
            Application.find({ studentId }).sort({ createdAt: -1 }).limit(5)
                .populate({
                    path: "jobId",
                    select: "jobTitle companyName category status archivedAt location budgetType hourlyRate budget currency applicationDeadline jobProviderId",
                    populate: { path: "jobProviderId", select: "companyName industry companyWebsite" }
                }).lean().exec(),
            Job.find({
                archivedAt: null,
                status: "open",
                moderationStatus: { $ne: "hidden" },
                providerSuspendedAt: null,
                applicationDeadline: { $gt: now },
                suitableFor: { $in: ["Any Year", req.studentAccount.yearOfStudy] }
            }).sort({ createdAt: -1 }).limit(4)
                .populate({ path: "jobProviderId", select: "companyName industry companyWebsite" })
                .lean().exec()
        ]);
        const counts = Object.fromEntries(statusGroups.map((group) => [group._id, group.count]));
        return res.json({
            summary: {
                pendingApplications: counts.pending_review || 0,
                inProgress: counts.in_progress || 0,
                completedJobs: counts.completed || 0,
                totalApplications: Object.values(counts).reduce((total, count) => total + count, 0)
            },
            recentApplications: recentApplications.map((application) => serializeApplication(application, { includeNote: false })),
            recentJobs: recentJobs.map((job) => serializeJobSummary(job))
        });
    } catch (error) {
        return res.status(500).json({ error: "Student dashboard loading failed" });
    }
}

export async function getStudentJobHistory(req, res) {
    try {
        const requestedStatus = req.query?.status || "all";
        if (!["all", ...HISTORY_STATUSES].includes(requestedStatus)) {
            return res.status(400).json({ error: "Invalid Job History status filter" });
        }
        const page = req.query?.page === undefined ? 1 : Number(req.query.page);
        const limit = req.query?.limit === undefined ? 12 : Number(req.query.limit);
        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
            return res.status(400).json({ error: "Pagination requires positive integers and a limit no greater than 50" });
        }
        const filter = {
            studentId: studentIdentifier(req),
            status: requestedStatus === "all" ? { $in: HISTORY_STATUSES } : requestedStatus
        };
        const [applications, total] = await Promise.all([
            Application.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit)
                .populate({
                    path: "jobId",
                    select: "jobTitle companyName category status archivedAt location budgetType hourlyRate budget currency applicationDeadline jobProviderId",
                    populate: { path: "jobProviderId", select: "companyName industry companyWebsite" }
                }).lean().exec(),
            Application.countDocuments(filter)
        ]);
        return res.json({
            applications: applications.map((application) => serializeApplication(application, { includeNote: false })),
            pagination: { page, limit, total, pages: total === 0 ? 0 : Math.ceil(total / limit) }
        });
    } catch (error) {
        return res.status(500).json({ error: "Job History loading failed" });
    }
}
