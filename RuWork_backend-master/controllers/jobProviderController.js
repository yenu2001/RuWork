import bcrypt from "bcrypt";
import Application from "../models/application.js";
import Job from "../models/job.js";
import JobProvider from "../models/jobProvider.js";
import { serializeApplication } from "./applicationController.js";
import { serializeJobSummary } from "./jobController.js";
import {
    JOB_PROVIDER_ROLE,
    createAccessToken,
    getPasswordValidationError,
    hasBasicEmailFormat,
    normalizeEmail
} from "../utils/account.js";
import { emailDelivery } from "../utils/emailService.js";
import {
    allowImmediateVerificationRetry,
    issueVerificationToken
} from "../utils/emailVerification.js";
import { getPlatformSettings } from "../utils/admin.js";

const PROVIDER_PROFILE_FIELDS = [
    "companyName", "companyAddress", "phoneNumber", "companySize", "industry",
    "companyWebsite", "companyDescription", "firstName", "lastName"
];
const PROVIDER_PROTECTED_FIELDS = [
    "companyEmail", "role", "accountStatus", "isEmailVerified", "password",
    "averageRating", "reviewCount",
    "emailVerificationTokenHash", "emailVerificationExpiresAt", "verificationEmailSentAt",
    "reviewedAt", "reviewedBy", "rejectionReason",
    "moderationStatus", "moderationReason", "moderatedAt", "moderatedBy"
];

export function serializeProviderProfile(provider) {
    return {
        id: provider._id.toString(),
        companyName: provider.companyName,
        companyEmail: provider.companyEmail,
        phoneNumber: provider.phoneNumber,
        companyAddress: provider.companyAddress,
        companySize: provider.companySize,
        industry: provider.industry,
        companyWebsite: provider.companyWebsite || "",
        companyDescription: provider.companyDescription,
        averageRating: provider.averageRating ?? null,
        reviewCount: provider.reviewCount || 0,
        firstName: provider.firstName,
        lastName: provider.lastName,
        isEmailVerified: provider.isEmailVerified,
        accountStatus: provider.accountStatus,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt
    };
}

function providerProfilePayload(body = {}) {
    const protectedField = PROVIDER_PROTECTED_FIELDS.find((field) => Object.hasOwn(body, field));
    if (protectedField) throw new Error(`${protectedField} cannot be changed through the profile`);
    const payload = {};
    for (const field of PROVIDER_PROFILE_FIELDS) {
        if (!Object.hasOwn(body, field)) continue;
        payload[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
    }
    if (!Object.keys(payload).length) throw new Error("Provide at least one editable profile field");
    return payload;
}

function profileError(res, error, fallback) {
    if (error?.name === "ValidationError") {
        return res.status(400).json({ error: Object.values(error.errors || {})[0]?.message || "Company profile information is invalid" });
    }
    if (error?.name === "CastError" || error?.message?.includes("cannot be changed") || error?.message?.startsWith("Provide at least")) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: fallback });
}

export async function registerJobProvider(req, res) {
    try {
        const settings = await getPlatformSettings();
        if (!settings.providerRegistrationOpen) {
            return res.status(403).json({ error: "Job Provider registration is currently closed", code: "REGISTRATION_CLOSED" });
        }
        const dataJ = req.body || {};
        const companyEmail = normalizeEmail(dataJ.companyEmail);
        const passwordError = getPasswordValidationError(dataJ.password);

        if (!hasBasicEmailFormat(companyEmail)) {
            return res.status(400).json({ error: "A valid company email is required" });
        }

        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        const hashedPassword = await bcrypt.hash(dataJ.password, 10);
        const newJobProvider = new JobProvider({
            companyName: dataJ.companyName,
            companyEmail,
            phoneNumber: dataJ.phoneNumber,
            companyAddress: dataJ.companyAddress,
            companySize: dataJ.companySize,
            industry: dataJ.industry,
            companyWebsite: dataJ.companyWebsite,
            companyDescription: dataJ.companyDescription,
            firstName: dataJ.firstName,
            lastName: dataJ.lastName,
            password: hashedPassword,
            isEmailVerified: false,
            accountStatus: "pending",
            role: JOB_PROVIDER_ROLE
        });
        const verificationToken = issueVerificationToken(newJobProvider);

        await newJobProvider.save();

        try {
            await emailDelivery.sendVerificationEmail({
                recipient: newJobProvider.companyEmail,
                recipientName: newJobProvider.companyName,
                token: verificationToken,
                accountType: "jobProvider"
            });
        } catch (error) {
            await allowImmediateVerificationRetry(newJobProvider).catch(() => {});
            return res.status(503).json({
                error: "Account created, but the verification email could not be sent. Please request another verification email.",
                code: "VERIFICATION_EMAIL_NOT_SENT"
            });
        }

        return res.status(201).json({
            message: "Job Provider account submitted. Verify the company email and await Admin approval.",
            accountStatus: newJobProvider.accountStatus,
            isEmailVerified: newJobProvider.isEmailVerified
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ error: "An account already uses this company email" });
        }

        if (error?.name === "ValidationError") {
            return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({ error: "Job Provider registration failed" });
    }
}

export async function loginJobProvider(req, res) {
    try {
        const dataJ = req.body || {};
        const companyEmail = normalizeEmail(dataJ.companyEmail);

        if (!companyEmail || typeof dataJ.password !== "string") {
            return res.status(400).json({
                error: "Company email and password are required"
            });
        }

        const jobProvider = await JobProvider.findOne({ companyEmail });
        const isPasswordCorrect = jobProvider &&
            await bcrypt.compare(dataJ.password, jobProvider.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({ error: "Invalid company email or password" });
        }

        if (!jobProvider.isEmailVerified) {
            return res.status(403).json({
                error: "Please verify the Job Provider email address before continuing.",
                code: "EMAIL_NOT_VERIFIED"
            });
        }

        if (jobProvider.accountStatus !== "approved") {
            const rejected = jobProvider.accountStatus === "rejected";
            return res.status(403).json({
                error: rejected
                    ? "Your registration was rejected by an administrator."
                    : "Your verified registration is currently awaiting administrator approval.",
                code: rejected ? "ACCOUNT_REJECTED" : "ACCOUNT_PENDING"
            });
        }

        if (jobProvider.moderationStatus === "suspended") {
            return res.status(403).json({
                error: "This Job Provider account has been suspended by an administrator.",
                code: "ACCOUNT_SUSPENDED"
            });
        }

        const token = createAccessToken(jobProvider, jobProvider.companyEmail);
        return res.json({ message: "Login successful", token });
    } catch (error) {
        return res.status(500).json({ error: "Login failed" });
    }
}

export function getMyCompanyProfile(req, res) {
    return res.json({ profile: serializeProviderProfile(req.jobProviderAccount) });
}

export async function updateMyCompanyProfile(req, res) {
    try {
        const payload = providerProfilePayload(req.body);
        const companyNameChanged = Object.hasOwn(payload, "companyName") &&
            payload.companyName !== req.jobProviderAccount.companyName;
        Object.assign(req.jobProviderAccount, payload);
        await req.jobProviderAccount.save();
        if (companyNameChanged) {
            await Job.updateMany(
                { jobProviderId: req.jobProviderAccount._id },
                { $set: { companyName: req.jobProviderAccount.companyName } }
            );
        }
        return res.json({
            message: companyNameChanged
                ? "Company profile and all owned Jobs updated successfully"
                : "Company profile updated successfully",
            profile: serializeProviderProfile(req.jobProviderAccount)
        });
    } catch (error) {
        return profileError(res, error, "Company profile update failed");
    }
}

export async function getProviderDashboard(req, res) {
    try {
        const providerId = req.jobProviderAccount._id;
        const [jobGroups, applicationGroups, recentJobs, recentApplications] = await Promise.all([
            Job.aggregate([
                { $match: { jobProviderId: providerId, archivedAt: null } },
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),
            Application.aggregate([
                { $match: { jobProviderId: providerId } },
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),
            Job.find({ jobProviderId: providerId, archivedAt: null }).sort({ createdAt: -1 }).limit(5).lean().exec(),
            Application.find({ jobProviderId: providerId }).sort({ createdAt: -1 }).limit(5)
                .populate({ path: "studentId", select: "firstName lastName faculty fieldOfStudy yearOfStudy" })
                .populate({ path: "jobId", select: "jobTitle companyName category status archivedAt location budgetType hourlyRate budget currency applicationDeadline" })
                .lean().exec()
        ]);
        const jobCounts = Object.fromEntries(jobGroups.map((group) => [group._id, group.count]));
        const applicationCounts = Object.fromEntries(applicationGroups.map((group) => [group._id, group.count]));
        const recentJobIds = recentJobs.map((job) => job._id);
        const applicationCountGroups = recentJobIds.length ? await Application.aggregate([
            { $match: { jobId: { $in: recentJobIds } } },
            { $group: { _id: "$jobId", count: { $sum: 1 } } }
        ]) : [];
        const applicationCountByJob = new Map(applicationCountGroups.map((group) => [group._id.toString(), group.count]));
        return res.json({
            summary: {
                openJobs: jobCounts.open || 0,
                totalApplicants: Object.values(applicationCounts).reduce((total, count) => total + count, 0),
                inProgress: applicationCounts.in_progress || 0,
                completedEngagements: applicationCounts.completed || 0
            },
            recentJobs: recentJobs.map((job) => serializeJobSummary({
                ...job,
                companyName: req.jobProviderAccount.companyName,
                applicationCount: applicationCountByJob.get(job._id.toString()) || 0
            })),
            recentApplications: recentApplications.map((application) => serializeApplication({
                ...application,
                ...(application.jobId ? {
                    jobId: { ...application.jobId, companyName: req.jobProviderAccount.companyName }
                } : {})
            }, { includeNote: false }))
        });
    } catch (error) {
        return res.status(500).json({ error: "Provider dashboard loading failed" });
    }
}
