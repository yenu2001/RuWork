import bcrypt from "bcrypt";
import mongoose from "mongoose";
import Admin from "../models/admin.js";
import AdminAudit from "../models/adminAudit.js";
import Application from "../models/application.js";
import Job from "../models/job.js";
import JobProvider from "../models/jobProvider.js";
import Message from "../models/message.js";
import Notification from "../models/notification.js";
import PlatformSetting from "../models/platformSetting.js";
import Review from "../models/review.js";
import User from "../models/user.js";
import {
    ACCOUNT_STATUSES,
    createAccessToken,
    normalizeEmail
} from "../utils/account.js";
import {
    ACCOUNT_MODERATION_STATUSES,
    AUDIT_ACTIONS,
    AUDIT_ENTITY_TYPES,
    AdminInputError,
    CONTENT_MODERATION_STATUSES,
    REVIEW_MODERATION_STATUSES,
    SETTINGS_DEFAULTS,
    SETTING_FIELDS,
    adminPagination,
    assertOnlyFields,
    boundedSearch,
    createAdminAudit,
    escapeAdminRegex,
    getPlatformSettings,
    moderationReason
} from "../utils/admin.js";
import { APPLICATION_STATUSES } from "../utils/application.js";
import { JOB_STATUSES } from "../utils/job.js";
import { recalculateReviewAggregates } from "../utils/ratingAggregates.js";

const REGISTRATION_TYPES = ["student", "jobProvider"];
// The merged Student/Provider queue reads offset + limit documents per collection, so its
// page bound stays well below the generic Admin listing bound.
const REGISTRATION_MAX_PAGE = 200;
const ORIGINAL_COUNTS = new Map([
    [User, User.countDocuments], [JobProvider, JobProvider.countDocuments], [Job, Job.countDocuments],
    [Application, Application.countDocuments], [Review, Review.countDocuments],
    [Message, Message.countDocuments], [Notification, Notification.countDocuments]
]);
const ORIGINAL_AUDIT_FIND = AdminAudit.find;

function identifier(value) {
    if (typeof value === "string") return value;
    if (typeof value?.toHexString === "function") return value.toHexString();
    if (value?._id && value._id !== value) return identifier(value._id);
    return value?.toString?.();
}

function serializeAudit(document) {
    const audit = typeof document?.toObject === "function" ? document.toObject() : document;
    const admin = audit.adminId && typeof audit.adminId === "object" && "email" in audit.adminId ? audit.adminId : null;
    return {
        id: identifier(audit._id || audit.id),
        action: audit.action,
        entityType: audit.entityType,
        entityId: identifier(audit.entityId),
        metadata: audit.metadata || {},
        admin: admin ? { id: identifier(admin._id || admin.id), firstName: admin.firstName, lastName: admin.lastName, email: admin.email } : { id: identifier(audit.adminId) },
        createdAt: audit.createdAt
    };
}

function adminError(res, error, fallback) {
    if (error instanceof AdminInputError || error?.name === "ValidationError" || error?.name === "CastError") {
        const message = error instanceof AdminInputError
            ? error.message
            : Object.values(error.errors || {})[0]?.message || error.message || "Admin input is invalid";
        return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: fallback });
}

function serializeStudentRegistration(student) {
    return {
        id: student._id.toString(),
        type: "student",
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phoneNumber: student.phoneNumber,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        university: student.university,
        faculty: student.faculty,
        fieldOfStudy: student.fieldOfStudy,
        yearOfStudy: student.yearOfStudy,
        isEmailVerified: student.isEmailVerified,
        accountStatus: student.accountStatus,
        rejectionReason: student.rejectionReason,
        reviewedAt: student.reviewedAt,
        moderationStatus: student.moderationStatus || "active",
        moderationReason: student.moderationReason,
        moderatedAt: student.moderatedAt,
        registeredAt: student.createdAt,
        updatedAt: student.updatedAt
    };
}

function serializeJobProviderRegistration(provider) {
    return {
        id: provider._id.toString(),
        type: "jobProvider",
        companyName: provider.companyName,
        companyEmail: provider.companyEmail,
        phoneNumber: provider.phoneNumber,
        companyAddress: provider.companyAddress,
        companySize: provider.companySize,
        industry: provider.industry,
        companyWebsite: provider.companyWebsite,
        companyDescription: provider.companyDescription,
        firstName: provider.firstName,
        lastName: provider.lastName,
        isEmailVerified: provider.isEmailVerified,
        accountStatus: provider.accountStatus,
        rejectionReason: provider.rejectionReason,
        reviewedAt: provider.reviewedAt,
        moderationStatus: provider.moderationStatus || "active",
        moderationReason: provider.moderationReason,
        moderatedAt: provider.moderatedAt,
        registeredAt: provider.createdAt,
        updatedAt: provider.updatedAt
    };
}

function getRegistrationDefinition(type) {
    if (type === "student") {
        return {
            Model: User,
            serialize: serializeStudentRegistration
        };
    }

    if (type === "jobProvider") {
        return {
            Model: JobProvider,
            serialize: serializeJobProviderRegistration
        };
    }

    return null;
}

function validateRegistrationFilters(query) {
    const status = query.status || "pending";
    const type = query.type;

    if (!ACCOUNT_STATUSES.includes(status)) {
        return { error: "Invalid registration status" };
    }

    if (type && !REGISTRATION_TYPES.includes(type)) {
        return { error: "Invalid registration type" };
    }

    return { status, type };
}

export async function loginAdmin(req, res) {
    try {
        const dataA = req.body || {};
        const email = normalizeEmail(dataA.email);

        if (!email || typeof dataA.password !== "string") {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const admin = await Admin.findOne({ email });
        const isPasswordCorrect = admin &&
            await bcrypt.compare(dataA.password, admin.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = createAccessToken(admin, admin.email);
        return res.json({ message: "Login successful", token });
    } catch (error) {
        return res.status(500).json({ error: "Login failed" });
    }
}

export async function listRegistrations(req, res) {
    try {
        const filters = validateRegistrationFilters(req.query || {});
        if (filters.error) {
            return res.status(400).json({ error: filters.error });
        }

        const { page, limit } = adminPagination(req.query, 20, { maxPage: REGISTRATION_MAX_PAGE });
        const offset = (page - 1) * limit;
        const accountFilter = { accountStatus: filters.status };
        const sources = [];
        if (!filters.type || filters.type === "student") {
            sources.push({ Model: User, serialize: serializeStudentRegistration });
        }

        if (!filters.type || filters.type === "jobProvider") {
            sources.push({ Model: JobProvider, serialize: serializeJobProviderRegistration });
        }

        // Two collections back one merged queue, so each source is read only as far as the
        // requested page can reach before the merged newest-first slice is taken.
        const results = await Promise.all(sources.map(async ({ Model, serialize }) => {
            const [accounts, total] = await Promise.all([
                Model.find(accountFilter).sort({ createdAt: -1 }).limit(offset + limit).lean().exec(),
                Model.countDocuments(accountFilter)
            ]);
            return { registrations: accounts.map(serialize), total: Number(total) || 0 };
        }));

        const total = results.reduce((sum, result) => sum + result.total, 0);
        const registrations = results
            .flatMap((result) => result.registrations)
            .sort((left, right) =>
                new Date(right.registeredAt || 0) - new Date(left.registeredAt || 0)
            )
            .slice(offset, offset + limit);

        return res.json({
            filters: { status: filters.status, type: filters.type || "all" },
            count: registrations.length,
            registrations,
            pagination: { page, limit, total, pages: total ? Math.ceil(total / limit) : 0 }
        });
    } catch (error) {
        return adminError(res, error, "Registration listing failed");
    }
}

export async function getAdminDashboard(req, res) {
    try {
        const now = new Date();
        const [pendingStudents, pendingProviders, totalStudents, totalProviders, openJobs] = await Promise.all([
            User.countDocuments({ accountStatus: "pending" }),
            JobProvider.countDocuments({ accountStatus: "pending" }),
            User.countDocuments({}),
            JobProvider.countDocuments({}),
            Job.countDocuments({ archivedAt: null, status: "open", applicationDeadline: { $gt: now } })
        ]);
        const count = async (Model, filter = {}) => {
            if (mongoose.connection.readyState === 0 && Model.countDocuments === ORIGINAL_COUNTS.get(Model)) return 0;
            return Number(await Model.countDocuments(filter)) || 0;
        };
        const [
            approvedStudents, rejectedStudents, suspendedStudents,
            approvedProviders, rejectedProviders, suspendedProviders,
            totalJobs, draftJobs, closedJobs, archivedJobs, hiddenJobs,
            ...applicationAndCommunication
        ] = await Promise.all([
            count(User, { accountStatus: "approved" }),
            count(User, { accountStatus: "rejected" }),
            count(User, { moderationStatus: "suspended" }),
            count(JobProvider, { accountStatus: "approved" }),
            count(JobProvider, { accountStatus: "rejected" }),
            count(JobProvider, { moderationStatus: "suspended" }),
            count(Job, {}), count(Job, { status: "draft" }), count(Job, { status: "closed" }),
            count(Job, { archivedAt: { $ne: null } }), count(Job, { moderationStatus: "hidden" }),
            ...APPLICATION_STATUSES.map((status) => count(Application, { status })),
            count(Review, {}), count(Review, { moderationStatus: { $ne: "hidden" } }), count(Review, { moderationStatus: "hidden" }),
            count(Message, {}), count(Notification, {})
        ]);
        const applicationCounts = Object.fromEntries(APPLICATION_STATUSES.map((status, index) => [status, applicationAndCommunication[index]]));
        const offset = APPLICATION_STATUSES.length;
        const [totalReviews, visibleReviews, hiddenReviews, totalMessages, totalNotifications] = applicationAndCommunication.slice(offset);
        let recentAudits = [];
        if (mongoose.connection.readyState !== 0 || AdminAudit.find !== ORIGINAL_AUDIT_FIND) {
            recentAudits = await AdminAudit.find({}).sort({ createdAt: -1 }).limit(6).lean().exec();
        }
        return res.json({
            summary: {
                pendingRegistrations: pendingStudents + pendingProviders,
                pendingStudents,
                pendingProviders,
                totalStudents,
                totalProviders,
                openJobs
            },
            statistics: {
                accounts: {
                    students: { total: totalStudents, approved: approvedStudents, pending: pendingStudents, rejected: rejectedStudents, suspended: suspendedStudents },
                    providers: { total: totalProviders, approved: approvedProviders, pending: pendingProviders, rejected: rejectedProviders, suspended: suspendedProviders }
                },
                jobs: { total: totalJobs, draft: draftJobs, open: openJobs, closed: closedJobs, archived: archivedJobs, hidden: hiddenJobs },
                applications: applicationCounts,
                reviews: { total: totalReviews, visible: visibleReviews, hidden: hiddenReviews },
                communication: { messages: totalMessages, notifications: totalNotifications }
            },
            recentAudits: recentAudits.map(serializeAudit)
        });
    } catch (error) {
        return res.status(500).json({ error: "Admin dashboard loading failed" });
    }
}

export async function getRegistration(req, res) {
    try {
        const definition = getRegistrationDefinition(req.params.type);
        if (!definition) {
            return res.status(400).json({ error: "Invalid registration type" });
        }

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ error: "Registration not found" });
        }

        const account = await definition.Model.findById(req.params.id);
        if (!account) {
            return res.status(404).json({ error: "Registration not found" });
        }

        return res.json({ registration: definition.serialize(account) });
    } catch (error) {
        return res.status(500).json({ error: "Registration lookup failed" });
    }
}

async function reviewRegistration(req, res, decision) {
    try {
        assertOnlyFields(req.body || {}, decision === "rejected" ? ["rejectionReason"] : []);
        const definition = getRegistrationDefinition(req.params.type);
        if (!definition) {
            return res.status(400).json({ error: "Invalid registration type" });
        }

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ error: "Registration not found" });
        }

        const account = await definition.Model.findById(req.params.id);
        if (!account) {
            return res.status(404).json({ error: "Registration not found" });
        }

        if (account.accountStatus !== "pending") {
            return res.status(409).json({
                error: `Registration has already been ${account.accountStatus}`,
                code: "REGISTRATION_ALREADY_REVIEWED"
            });
        }

        if (decision === "approved" && !account.isEmailVerified) {
            return res.status(409).json({
                error: "Email must be verified before this registration can be approved",
                code: "EMAIL_NOT_VERIFIED"
            });
        }

        let rejectionReason;
        if (decision === "rejected" && req.body?.rejectionReason !== undefined) {
            if (typeof req.body.rejectionReason !== "string") {
                return res.status(400).json({ error: "Rejection reason must be text" });
            }

            rejectionReason = req.body.rejectionReason.trim();
            if (rejectionReason.length > 500) {
                return res.status(400).json({
                    error: "Rejection reason must not exceed 500 characters"
                });
            }
        }

        const previous = {
            accountStatus: account.accountStatus,
            rejectionReason: account.rejectionReason,
            reviewedAt: account.reviewedAt,
            reviewedBy: account.reviewedBy
        };
        account.accountStatus = decision;
        account.rejectionReason = decision === "rejected"
            ? rejectionReason || undefined
            : undefined;
        account.reviewedAt = new Date();
        account.reviewedBy = req.user.sub;
        await account.save();
        try {
            await createAdminAudit({
                adminId: req.user.sub,
                action: decision === "approved" ? "REGISTRATION_APPROVED" : "REGISTRATION_REJECTED",
                entityType: "registration",
                entityId: account._id,
                metadata: { accountType: req.params.type, decision, ...(rejectionReason ? { reason: rejectionReason } : {}) }
            });
        } catch (error) {
            Object.assign(account, previous);
            await account.save().catch(() => {});
            throw error;
        }

        return res.json({
            message: `Registration ${decision} successfully`,
            registration: definition.serialize(account)
        });
    } catch (error) {
        return adminError(res, error, "Registration review failed");
    }
}

export function approveRegistration(req, res) {
    return reviewRegistration(req, res, "approved");
}

export function rejectRegistration(req, res) {
    return reviewRegistration(req, res, "rejected");
}

function accountFilters(query, type) {
    const accountStatus = query?.accountStatus || "all";
    const moderationStatus = query?.moderationStatus || "all";
    const verified = query?.verified || "all";
    if (!["all", ...ACCOUNT_STATUSES].includes(accountStatus)) throw new AdminInputError("Invalid account-status filter");
    if (!["all", ...ACCOUNT_MODERATION_STATUSES].includes(moderationStatus)) throw new AdminInputError("Invalid moderation-status filter");
    if (!["all", "true", "false"].includes(verified)) throw new AdminInputError("Invalid email-verification filter");
    const filter = {
        ...(accountStatus === "all" ? {} : { accountStatus }),
        ...(moderationStatus === "all" ? {} : moderationStatus === "active" ? { moderationStatus: { $ne: "suspended" } } : { moderationStatus }),
        ...(verified === "all" ? {} : { isEmailVerified: verified === "true" })
    };
    const search = boundedSearch(query?.q);
    if (search) {
        const pattern = { $regex: escapeAdminRegex(search), $options: "i" };
        filter.$or = type === "student"
            ? [{ firstName: pattern }, { lastName: pattern }, { email: pattern }, { fieldOfStudy: pattern }]
            : [{ companyName: pattern }, { companyEmail: pattern }, { industry: pattern }, { firstName: pattern }, { lastName: pattern }];
    }
    return filter;
}

async function listAccounts(req, res, { Model, type, serialize, label }) {
    try {
        const { page, limit } = adminPagination(req.query);
        const filter = accountFilters(req.query, type);
        const [accounts, total] = await Promise.all([
            Model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
            Model.countDocuments(filter)
        ]);
        return res.json({
            accounts: accounts.map(serialize),
            pagination: { page, limit, total, pages: total ? Math.ceil(total / limit) : 0 }
        });
    } catch (error) {
        return adminError(res, error, `${label} listing failed`);
    }
}

export function listAdminStudents(req, res) {
    return listAccounts(req, res, { Model: User, type: "student", serialize: serializeStudentRegistration, label: "Student" });
}

export function listAdminProviders(req, res) {
    return listAccounts(req, res, { Model: JobProvider, type: "jobProvider", serialize: serializeJobProviderRegistration, label: "Job Provider" });
}

async function getAccount(req, res, { Model, serialize, label }) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: `${label} not found` });
        const account = await Model.findById(req.params.id);
        if (!account) return res.status(404).json({ error: `${label} not found` });
        return res.json({ account: serialize(account) });
    } catch (error) {
        return res.status(500).json({ error: `${label} lookup failed` });
    }
}

export function getAdminStudent(req, res) {
    return getAccount(req, res, { Model: User, serialize: serializeStudentRegistration, label: "Student" });
}

export function getAdminProvider(req, res) {
    return getAccount(req, res, { Model: JobProvider, serialize: serializeJobProviderRegistration, label: "Job Provider" });
}

async function moderateAccount(req, res, { Model, serialize, type, label }) {
    try {
        assertOnlyFields(req.body, ["status", "reason"]);
        if (!ACCOUNT_MODERATION_STATUSES.includes(req.body?.status)) throw new AdminInputError("Invalid account moderation status");
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: `${label} not found` });
        const account = await Model.findById(req.params.id);
        if (!account) return res.status(404).json({ error: `${label} not found` });
        const currentStatus = account.moderationStatus || "active";
        if (currentStatus === req.body.status) return res.status(409).json({ error: `${label} is already ${currentStatus}` });
        const reason = moderationReason(req.body.reason, { required: req.body.status === "suspended" });
        const previous = {
            moderationStatus: account.moderationStatus,
            moderationReason: account.moderationReason,
            moderatedAt: account.moderatedAt,
            moderatedBy: account.moderatedBy
        };
        const moderatedAt = new Date();
        account.moderationStatus = req.body.status;
        account.moderationReason = req.body.status === "suspended" ? reason : undefined;
        account.moderatedAt = moderatedAt;
        account.moderatedBy = req.user.sub;
        await account.save();
        try {
            if (type === "jobProvider") {
                await Job.updateMany(
                    { jobProviderId: account._id },
                    { $set: { providerSuspendedAt: req.body.status === "suspended" ? moderatedAt : null } }
                );
            }
            await createAdminAudit({
                adminId: req.user.sub,
                action: type === "student"
                    ? req.body.status === "suspended" ? "STUDENT_SUSPENDED" : "STUDENT_RESTORED"
                    : req.body.status === "suspended" ? "PROVIDER_SUSPENDED" : "PROVIDER_RESTORED",
                entityType: type,
                entityId: account._id,
                metadata: { from: currentStatus, to: req.body.status, ...(reason ? { reason } : {}) }
            });
        } catch (error) {
            Object.assign(account, previous);
            await account.save().catch(() => {});
            if (type === "jobProvider") {
                await Job.updateMany(
                    { jobProviderId: account._id },
                    { $set: { providerSuspendedAt: currentStatus === "suspended" ? previous.moderatedAt || new Date() : null } }
                ).catch(() => {});
            }
            throw error;
        }
        return res.json({
            message: `${label} ${req.body.status === "suspended" ? "suspended" : "restored"} successfully`,
            account: serialize(account)
        });
    } catch (error) {
        return adminError(res, error, `${label} moderation failed`);
    }
}

export function moderateStudent(req, res) {
    return moderateAccount(req, res, { Model: User, serialize: serializeStudentRegistration, type: "student", label: "Student" });
}

export function moderateProvider(req, res) {
    return moderateAccount(req, res, { Model: JobProvider, serialize: serializeJobProviderRegistration, type: "jobProvider", label: "Job Provider" });
}

function serializeAdminJob(document) {
    const job = typeof document?.toObject === "function" ? document.toObject() : document;
    const provider = job.jobProviderId && typeof job.jobProviderId === "object" && "companyName" in job.jobProviderId ? job.jobProviderId : null;
    return {
        id: identifier(job._id || job.id),
        jobTitle: job.jobTitle,
        companyName: provider?.companyName || job.companyName,
        category: job.category,
        location: job.location,
        budgetType: job.budgetType,
        hourlyRate: job.budgetType === "hourly" ? job.hourlyRate : undefined,
        budget: job.budgetType === "fixed" ? job.budget : undefined,
        currency: job.currency || "LKR",
        status: job.status,
        archivedAt: job.archivedAt,
        applicationDeadline: job.applicationDeadline,
        moderationStatus: job.moderationStatus || "visible",
        moderationReason: job.moderationReason,
        moderatedAt: job.moderatedAt,
        providerSuspended: Boolean(job.providerSuspendedAt),
        provider: provider ? { id: identifier(provider._id || provider.id), companyName: provider.companyName, companyEmail: provider.companyEmail, moderationStatus: provider.moderationStatus || "active" } : { id: identifier(job.jobProviderId), companyName: job.companyName },
        jobDescription: job.jobDescription,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
    };
}

function adminJobFilter(query = {}) {
    const status = query.status || "all";
    const moderationStatus = query.moderationStatus || "all";
    const archived = query.archived || "all";
    if (!["all", ...JOB_STATUSES].includes(status)) throw new AdminInputError("Invalid Job status filter");
    if (!["all", ...CONTENT_MODERATION_STATUSES].includes(moderationStatus)) throw new AdminInputError("Invalid Job moderation filter");
    if (!["all", "true", "false"].includes(archived)) throw new AdminInputError("Invalid archived filter");
    const filter = {
        ...(status === "all" ? {} : { status }),
        ...(moderationStatus === "all" ? {} : moderationStatus === "visible" ? { moderationStatus: { $ne: "hidden" } } : { moderationStatus }),
        ...(archived === "all" ? {} : archived === "true" ? { archivedAt: { $ne: null } } : { archivedAt: null })
    };
    const search = boundedSearch(query.q);
    if (search) {
        const pattern = { $regex: escapeAdminRegex(search), $options: "i" };
        filter.$or = [{ jobTitle: pattern }, { companyName: pattern }, { location: pattern }];
    }
    return filter;
}

export async function listAdminJobs(req, res) {
    try {
        const { page, limit } = adminPagination(req.query);
        const filter = adminJobFilter(req.query);
        const [jobs, total] = await Promise.all([
            Job.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
                .populate({ path: "jobProviderId", select: "companyName companyEmail moderationStatus" }).lean().exec(),
            Job.countDocuments(filter)
        ]);
        return res.json({ jobs: jobs.map(serializeAdminJob), pagination: { page, limit, total, pages: total ? Math.ceil(total / limit) : 0 } });
    } catch (error) {
        return adminError(res, error, "Admin Job listing failed");
    }
}

export async function getAdminJob(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Job not found" });
        const job = await Job.findById(req.params.id)
            .populate({ path: "jobProviderId", select: "companyName companyEmail moderationStatus" }).lean().exec();
        if (!job) return res.status(404).json({ error: "Job not found" });
        return res.json({ job: serializeAdminJob(job) });
    } catch (error) {
        return res.status(500).json({ error: "Admin Job lookup failed" });
    }
}

export async function moderateJob(req, res) {
    try {
        assertOnlyFields(req.body, ["status", "reason"]);
        if (!CONTENT_MODERATION_STATUSES.includes(req.body?.status)) throw new AdminInputError("Invalid Job moderation status");
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Job not found" });
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ error: "Job not found" });
        const currentStatus = job.moderationStatus || "visible";
        if (currentStatus === req.body.status) return res.status(409).json({ error: `Job is already ${currentStatus}` });
        const reason = moderationReason(req.body.reason, { required: req.body.status === "hidden" });
        const previous = { moderationStatus: job.moderationStatus, moderationReason: job.moderationReason, moderatedAt: job.moderatedAt, moderatedBy: job.moderatedBy };
        job.moderationStatus = req.body.status;
        job.moderationReason = req.body.status === "hidden" ? reason : undefined;
        job.moderatedAt = new Date();
        job.moderatedBy = req.user.sub;
        await job.save();
        try {
            await createAdminAudit({
                adminId: req.user.sub,
                action: req.body.status === "hidden" ? "JOB_HIDDEN" : "JOB_RESTORED",
                entityType: "job",
                entityId: job._id,
                metadata: { from: currentStatus, to: req.body.status, ...(reason ? { reason } : {}) }
            });
        } catch (error) {
            Object.assign(job, previous);
            await job.save().catch(() => {});
            throw error;
        }
        await job.populate({ path: "jobProviderId", select: "companyName companyEmail moderationStatus" });
        return res.json({ message: `Job ${req.body.status === "hidden" ? "hidden" : "restored"} successfully`, job: serializeAdminJob(job) });
    } catch (error) {
        return adminError(res, error, "Job moderation failed");
    }
}

function serializeAdminReview(document) {
    const review = typeof document?.toObject === "function" ? document.toObject() : document;
    const student = review.studentId && typeof review.studentId === "object" && "firstName" in review.studentId ? review.studentId : null;
    const job = review.jobId && typeof review.jobId === "object" && "jobTitle" in review.jobId ? review.jobId : null;
    const provider = review.jobProviderId && typeof review.jobProviderId === "object" && "companyName" in review.jobProviderId ? review.jobProviderId : null;
    return {
        id: identifier(review._id || review.id), applicationId: identifier(review.applicationId), rating: review.rating,
        comment: review.comment || "", moderationStatus: review.moderationStatus || "active",
        moderationReason: review.moderationReason, moderatedAt: review.moderatedAt,
        student: student ? { id: identifier(student._id || student.id), firstName: student.firstName, lastName: student.lastName } : undefined,
        job: job ? { id: identifier(job._id || job.id), jobTitle: job.jobTitle, isArchived: Boolean(job.archivedAt) } : undefined,
        provider: provider ? { id: identifier(provider._id || provider.id), companyName: provider.companyName } : undefined,
        createdAt: review.createdAt, updatedAt: review.updatedAt
    };
}

export async function getAdminReview(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Review not found" });
        const review = await Review.findById(req.params.id)
            .populate({ path: "studentId", select: "firstName lastName" })
            .populate({ path: "jobId", select: "jobTitle archivedAt" })
            .populate({ path: "jobProviderId", select: "companyName" }).lean().exec();
        if (!review) return res.status(404).json({ error: "Review not found" });
        return res.json({ review: serializeAdminReview(review) });
    } catch (error) {
        return res.status(500).json({ error: "Admin Review lookup failed" });
    }
}

export async function moderateReview(req, res) {
    try {
        assertOnlyFields(req.body, ["status", "reason"]);
        if (!REVIEW_MODERATION_STATUSES.includes(req.body?.status)) throw new AdminInputError("Invalid Review moderation status");
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Review not found" });
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ error: "Review not found" });
        const currentStatus = review.moderationStatus || "active";
        if (currentStatus === req.body.status) return res.status(409).json({ error: `Review is already ${currentStatus}` });
        const reason = moderationReason(req.body.reason, { required: req.body.status === "hidden" });
        const previous = { moderationStatus: review.moderationStatus, moderationReason: review.moderationReason, moderatedAt: review.moderatedAt, moderatedBy: review.moderatedBy };
        review.moderationStatus = req.body.status;
        review.moderationReason = req.body.status === "hidden" ? reason : undefined;
        review.moderatedAt = new Date();
        review.moderatedBy = req.user.sub;
        await review.save();
        try {
            await recalculateReviewAggregates(review.jobId, review.jobProviderId);
            await createAdminAudit({
                adminId: req.user.sub,
                action: req.body.status === "hidden" ? "REVIEW_HIDDEN" : "REVIEW_RESTORED",
                entityType: "review",
                entityId: review._id,
                metadata: { from: currentStatus, to: req.body.status, ...(reason ? { reason } : {}) }
            });
        } catch (error) {
            Object.assign(review, previous);
            await review.save().catch(() => {});
            await recalculateReviewAggregates(review.jobId, review.jobProviderId).catch(() => {});
            throw error;
        }
        await review.populate({ path: "studentId", select: "firstName lastName" });
        await review.populate({ path: "jobId", select: "jobTitle archivedAt" });
        await review.populate({ path: "jobProviderId", select: "companyName" });
        return res.json({ message: `Review ${req.body.status === "hidden" ? "hidden" : "restored"} successfully`, review: serializeAdminReview(review) });
    } catch (error) {
        return adminError(res, error, "Review moderation failed");
    }
}

function serializeSettings(settings) {
    return {
        studentRegistrationOpen: settings.studentRegistrationOpen ?? SETTINGS_DEFAULTS.studentRegistrationOpen,
        providerRegistrationOpen: settings.providerRegistrationOpen ?? SETTINGS_DEFAULTS.providerRegistrationOpen,
        jobPostingOpen: settings.jobPostingOpen ?? SETTINGS_DEFAULTS.jobPostingOpen,
        updatedAt: settings.updatedAt
    };
}

export async function getAdminSettings(req, res) {
    try {
        return res.json({ settings: serializeSettings(await getPlatformSettings()) });
    } catch (error) {
        return res.status(500).json({ error: "Admin Settings loading failed" });
    }
}

export async function updateAdminSettings(req, res) {
    try {
        assertOnlyFields(req.body, SETTING_FIELDS);
        const fields = Object.keys(req.body || {});
        if (!fields.length) throw new AdminInputError("Provide at least one supported Setting");
        const payload = {};
        for (const field of fields) {
            if (typeof req.body[field] !== "boolean") throw new AdminInputError(`${field} must be true or false`);
            payload[field] = req.body[field];
        }
        let settings = await PlatformSetting.findOne({ singletonKey: "platform" });
        const created = !settings;
        if (!settings) settings = new PlatformSetting({ ...SETTINGS_DEFAULTS, updatedBy: req.user.sub });
        const previous = serializeSettings(settings);
        Object.assign(settings, payload, { updatedBy: req.user.sub });
        await settings.save();
        const changes = Object.fromEntries(fields.map((field) => [field, { from: previous[field], to: settings[field] }]));
        try {
            await createAdminAudit({ adminId: req.user.sub, action: "SETTINGS_UPDATED", entityType: "settings", entityId: settings._id, metadata: { changes } });
        } catch (error) {
            if (created) await PlatformSetting.deleteOne({ _id: settings._id }).catch(() => {});
            else {
                Object.assign(settings, Object.fromEntries(fields.map((field) => [field, previous[field]])));
                await settings.save().catch(() => {});
            }
            throw error;
        }
        return res.json({ message: "Admin Settings updated successfully", settings: serializeSettings(settings) });
    } catch (error) {
        return adminError(res, error, "Admin Settings update failed");
    }
}

export async function listAdminAudits(req, res) {
    try {
        const { page, limit } = adminPagination(req.query);
        const action = req.query?.action || "all";
        const entityType = req.query?.entityType || "all";
        if (!["all", ...AUDIT_ACTIONS].includes(action)) throw new AdminInputError("Invalid audit-action filter");
        if (!["all", ...AUDIT_ENTITY_TYPES].includes(entityType)) throw new AdminInputError("Invalid audit-entity filter");
        const filter = { ...(action === "all" ? {} : { action }), ...(entityType === "all" ? {} : { entityType }) };
        const [audits, total] = await Promise.all([
            AdminAudit.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
                .populate({ path: "adminId", select: "firstName lastName email" }).lean().exec(),
            AdminAudit.countDocuments(filter)
        ]);
        return res.json({ audits: audits.map(serializeAudit), pagination: { page, limit, total, pages: total ? Math.ceil(total / limit) : 0 } });
    } catch (error) {
        return adminError(res, error, "Admin audit loading failed");
    }
}

export {
    serializeJobProviderRegistration,
    serializeStudentRegistration
};
