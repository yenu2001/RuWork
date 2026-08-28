import mongoose from "mongoose";
import Application from "../models/application.js";
import Job from "../models/job.js";
import {
    ApplicationConflictError,
    ApplicationInputError,
    PROVIDER_APPLICATION_FILTERS,
    STUDENT_APPLICATION_FILTERS,
    assertApplicationTransition,
    identifier,
    normalizedNote,
    positivePrice
} from "../utils/application.js";
import { createNotificationSafely } from "../utils/communication.js";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const STUDENT_PUBLIC_FIELDS = "firstName lastName faculty fieldOfStudy yearOfStudy";
const JOB_PUBLIC_FIELDS = "jobTitle companyName category status archivedAt location budgetType hourlyRate budget currency applicationDeadline jobProviderId";
const APPLICATION_SYSTEM_FIELDS = [
    "studentId", "jobProviderId", "status", "budgetType", "currency", "appliedAt",
    "originalHourlyRate", "originalBudget", "approvedHourlyRate", "approvedBudget",
    "acceptedAt", "declinedAt", "withdrawnAt", "cancelledAt", "completedAt"
];

function getObject(document) {
    return typeof document?.toObject === "function"
        ? document.toObject({ getters: false, virtuals: false })
        : document;
}

function pagination(query = {}, defaultLimit = DEFAULT_LIMIT) {
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? defaultLimit : Number(query.limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
        throw new ApplicationInputError(`Pagination requires positive integers and a limit no greater than ${MAX_LIMIT}`);
    }
    return { page, limit };
}

function statusFilter(value, allowed) {
    const status = value || "all";
    if (!allowed.includes(status)) throw new ApplicationInputError("Invalid Application status filter");
    return status;
}

function isPopulated(value, field) {
    const object = getObject(value);
    return Boolean(object && typeof object === "object" && object[field] !== undefined);
}

function serializeJob(jobValue) {
    if (!isPopulated(jobValue, "jobTitle")) return undefined;
    const job = getObject(jobValue);
    const provider = getObject(job.jobProviderId);
    const currentCompanyName = provider && typeof provider === "object" && provider.companyName
        ? provider.companyName
        : job.companyName;
    return {
        id: identifier(job._id || job.id),
        jobTitle: job.jobTitle,
        companyName: currentCompanyName,
        category: job.category,
        location: job.location,
        status: job.status,
        isArchived: Boolean(job.archivedAt),
        budgetType: job.budgetType,
        hourlyRate: job.budgetType === "hourly" ? job.hourlyRate : undefined,
        budget: job.budgetType === "fixed" ? job.budget : undefined,
        currency: job.currency || "LKR",
        applicationDeadline: job.applicationDeadline
    };
}

function serializeStudent(studentValue) {
    if (!isPopulated(studentValue, "firstName")) return undefined;
    const student = getObject(studentValue);
    return {
        id: identifier(student._id || student.id),
        firstName: student.firstName,
        lastName: student.lastName,
        faculty: student.faculty || null,
        fieldOfStudy: student.fieldOfStudy,
        yearOfStudy: student.yearOfStudy
    };
}

export function serializeApplication(document, { includeNote = true } = {}) {
    const application = getObject(document);
    return {
        id: identifier(application._id || application.id),
        status: application.status,
        ...(includeNote ? { applicationNote: application.applicationNote } : {}),
        budgetType: application.budgetType,
        originalHourlyRate: application.budgetType === "hourly" ? application.originalHourlyRate : undefined,
        originalBudget: application.budgetType === "fixed" ? application.originalBudget : undefined,
        approvedHourlyRate: application.budgetType === "hourly" ? application.approvedHourlyRate ?? null : undefined,
        approvedBudget: application.budgetType === "fixed" ? application.approvedBudget ?? null : undefined,
        currency: application.currency || "LKR",
        declineReason: application.declineReason || null,
        cancellationReason: application.cancellationReason || null,
        appliedAt: application.appliedAt || application.createdAt,
        acceptedAt: application.acceptedAt || null,
        declinedAt: application.declinedAt || null,
        withdrawnAt: application.withdrawnAt || null,
        cancelledAt: application.cancelledAt || null,
        completedAt: application.completedAt || null,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        ...(serializeJob(application.jobId) ? { job: serializeJob(application.jobId) } : {}),
        ...(serializeStudent(application.studentId) ? { student: serializeStudent(application.studentId) } : {})
    };
}

function assertNoApplicationSystemFields(body = {}) {
    const field = APPLICATION_SYSTEM_FIELDS.find((name) => Object.hasOwn(body, name));
    if (field) throw new ApplicationInputError(`${field} cannot be set by the client`);
}

function ownsJob(job, req) {
    return identifier(job?.jobProviderId) === identifier(req.jobProviderAccount?._id);
}

function studentId(req) {
    return identifier(req.studentAccount?._id);
}

async function notifyApplication({ application, recipientType, recipientId, type, message }) {
    return createNotificationSafely({
        recipientType,
        recipientId,
        type,
        message,
        relatedJobId: application.jobId,
        relatedApplicationId: application._id
    });
}

function safeError(res, error, fallback) {
    if (error instanceof ApplicationConflictError || error?.code === 11000) {
        return res.status(409).json({
            error: error?.code === 11000 ? "You have already applied for this Job" : error.message,
            code: error?.code === 11000 ? "APPLICATION_ALREADY_EXISTS" : "APPLICATION_STATE_CONFLICT"
        });
    }
    if (error instanceof ApplicationInputError) return res.status(400).json({ error: error.message });
    if (error?.name === "ValidationError") {
        return res.status(400).json({ error: Object.values(error.errors || {})[0]?.message || "Application information is invalid" });
    }
    if (error?.name === "CastError") return res.status(400).json({ error: "Application information has an invalid value" });
    return res.status(500).json({ error: fallback });
}

export async function applyToJob(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(404).json({ error: "Job not found" });
        assertNoApplicationSystemFields(req.body);
        const applicationNote = normalizedNote(req.body?.applicationNote, "Application note", { required: true, maximum: 1000 });
        if (applicationNote.length < 20) throw new ApplicationInputError("Application note must be at least 20 characters");

        const job = await Job.findOne({
            _id: req.params.jobId,
            archivedAt: null,
            moderationStatus: { $ne: "hidden" },
            providerSuspendedAt: null
        });
        if (!job) return res.status(404).json({ error: "Job not found" });
        if (job.status !== "open" || new Date(job.applicationDeadline) <= new Date()) {
            return res.status(409).json({ error: "This Job is not accepting Applications", code: "JOB_NOT_AVAILABLE" });
        }

        const existing = await Application.findOne({ jobId: job._id, studentId: studentId(req) }).lean().exec();
        if (existing) {
            return res.status(409).json({ error: "You have already applied for this Job", code: "APPLICATION_ALREADY_EXISTS", applicationId: identifier(existing._id) });
        }

        const application = new Application({
            jobId: job._id,
            studentId: studentId(req),
            jobProviderId: job.jobProviderId,
            applicationNote,
            status: "pending_review",
            budgetType: job.budgetType,
            originalHourlyRate: job.budgetType === "hourly" ? job.hourlyRate : undefined,
            originalBudget: job.budgetType === "fixed" ? job.budget : undefined,
            currency: "LKR"
        });
        await application.save();
        await notifyApplication({
            application,
            recipientType: "jobProvider",
            recipientId: application.jobProviderId,
            type: "NEW_APPLICATION",
            message: `${req.studentAccount.firstName} ${req.studentAccount.lastName} submitted an Application for ${job.jobTitle}.`
        });
        return res.status(201).json({ message: "Application submitted successfully", application: serializeApplication(application) });
    } catch (error) {
        return safeError(res, error, "Application submission failed");
    }
}

export async function getMyApplicationForJob(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(404).json({ error: "Application not found" });
        const application = await Application.findOne({ jobId: req.params.jobId, studentId: studentId(req) }).lean().exec();
        return res.json({ application: application ? serializeApplication(application, { includeNote: false }) : null });
    } catch (error) {
        return res.status(500).json({ error: "Application lookup failed" });
    }
}

export async function listMyApplications(req, res) {
    try {
        const { page, limit } = pagination(req.query);
        const status = statusFilter(req.query?.status, STUDENT_APPLICATION_FILTERS);
        const filter = { studentId: studentId(req), ...(status === "all" ? {} : { status }) };
        const [applications, total] = await Promise.all([
            Application.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
                .populate({
                    path: "jobId",
                    select: JOB_PUBLIC_FIELDS,
                    populate: { path: "jobProviderId", select: "companyName industry companyWebsite" }
                }).lean().exec(),
            Application.countDocuments(filter)
        ]);
        return res.json({
            applications: applications.map((application) => serializeApplication(application, { includeNote: false })),
            pagination: { page, limit, total, pages: total === 0 ? 0 : Math.ceil(total / limit) }
        });
    } catch (error) {
        return safeError(res, error, "Application listing failed");
    }
}

export async function getMyApplication(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Application not found" });
        const application = await Application.findOne({ _id: req.params.id, studentId: studentId(req) })
            .populate({
                path: "jobId",
                select: JOB_PUBLIC_FIELDS,
                populate: { path: "jobProviderId", select: "companyName industry companyWebsite" }
            }).lean().exec();
        if (!application) return res.status(404).json({ error: "Application not found" });
        return res.json({ application: serializeApplication(application) });
    } catch (error) {
        return res.status(500).json({ error: "Application lookup failed" });
    }
}

async function transitionStudentApplication(req, res, nextStatus) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Application not found" });
        const application = await Application.findOne({ _id: req.params.id, studentId: studentId(req) });
        if (!application) return res.status(404).json({ error: "Application not found" });
        assertApplicationTransition(application.status, nextStatus, "student");
        application.status = nextStatus;
        if (nextStatus === "withdrawn") application.withdrawnAt = new Date();
        if (nextStatus === "cancelled") {
            application.cancelledAt = new Date();
            application.cancellationReason = normalizedNote(req.body?.cancellationReason, "Cancellation reason", { maximum: 500 });
        }
        await application.save();
        await notifyApplication({
            application,
            recipientType: "jobProvider",
            recipientId: application.jobProviderId,
            type: nextStatus === "withdrawn" ? "APPLICATION_WITHDRAWN" : "APPLICATION_CANCELLED",
            message: nextStatus === "withdrawn"
                ? `${req.studentAccount.firstName} ${req.studentAccount.lastName} withdrew their Application.`
                : `${req.studentAccount.firstName} ${req.studentAccount.lastName} cancelled an in-progress engagement.`
        });
        return res.json({
            message: nextStatus === "withdrawn" ? "Application withdrawn successfully" : "In-progress work cancelled successfully",
            application: serializeApplication(application)
        });
    } catch (error) {
        return safeError(res, error, "Application update failed");
    }
}

export const withdrawMyApplication = (req, res) => transitionStudentApplication(req, res, "withdrawn");
export const cancelMyApplication = (req, res) => transitionStudentApplication(req, res, "cancelled");

export async function listJobApplications(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(404).json({ error: "Job not found" });
        const job = await Job.findById(req.params.jobId);
        if (!job) return res.status(404).json({ error: "Job not found" });
        if (!ownsJob(job, req)) return res.status(403).json({ error: "You may view Applications only for your own Jobs" });
        const { page, limit } = pagination(req.query);
        const status = statusFilter(req.query?.status, PROVIDER_APPLICATION_FILTERS);
        const filter = { jobId: job._id, ...(status === "all" ? {} : { status }) };
        const [applications, total] = await Promise.all([
            Application.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
                .populate({ path: "studentId", select: STUDENT_PUBLIC_FIELDS }).lean().exec(),
            Application.countDocuments(filter)
        ]);
        return res.json({
            job: serializeJob({ ...getObject(job), companyName: req.jobProviderAccount.companyName }),
            applications: applications.map((application) => serializeApplication(application)),
            pagination: { page, limit, total, pages: total === 0 ? 0 : Math.ceil(total / limit) }
        });
    } catch (error) {
        return safeError(res, error, "Applicant listing failed");
    }
}

async function ownedProviderApplication(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(404).json({ error: "Application not found" });
        return null;
    }
    const application = await Application.findById(req.params.id).populate({ path: "studentId", select: STUDENT_PUBLIC_FIELDS });
    if (!application) {
        res.status(404).json({ error: "Application not found" });
        return null;
    }
    const job = await Job.findById(application.jobId);
    if (!job) {
        res.status(404).json({ error: "Related Job not found" });
        return null;
    }
    if (!ownsJob(job, req)) {
        res.status(403).json({ error: "You may manage Applications only for your own Jobs" });
        return null;
    }
    return { application, job };
}

export async function getProviderApplication(req, res) {
    try {
        const owned = await ownedProviderApplication(req, res);
        if (!owned) return undefined;
        const application = getObject(owned.application);
        application.jobId = { ...getObject(owned.job), companyName: req.jobProviderAccount.companyName };
        return res.json({ application: serializeApplication(application) });
    } catch (error) {
        return res.status(500).json({ error: "Application lookup failed" });
    }
}

export async function acceptApplication(req, res) {
    try {
        const owned = await ownedProviderApplication(req, res);
        if (!owned) return undefined;
        const { application } = owned;
        assertApplicationTransition(application.status, "in_progress", "provider");
        if (application.budgetType === "hourly") {
            application.approvedHourlyRate = positivePrice(req.body?.approvedHourlyRate, "Final agreed hourly rate");
        } else {
            application.approvedBudget = positivePrice(req.body?.approvedBudget, "Final agreed fixed budget");
        }
        application.status = "in_progress";
        application.acceptedAt = new Date();
        await application.save();
        await notifyApplication({
            application,
            recipientType: "student",
            recipientId: application.studentId,
            type: "APPLICATION_ACCEPTED",
            message: `Your Application for ${owned.job.jobTitle} was accepted.`
        });
        return res.json({ message: "Application accepted and work is now in progress", application: serializeApplication(application) });
    } catch (error) {
        return safeError(res, error, "Application acceptance failed");
    }
}

export async function declineApplication(req, res) {
    try {
        const owned = await ownedProviderApplication(req, res);
        if (!owned) return undefined;
        const { application } = owned;
        assertApplicationTransition(application.status, "declined", "provider");
        application.status = "declined";
        application.declineReason = normalizedNote(req.body?.declineReason, "Decline reason", { maximum: 500 });
        application.declinedAt = new Date();
        await application.save();
        await notifyApplication({
            application,
            recipientType: "student",
            recipientId: application.studentId,
            type: "APPLICATION_DECLINED",
            message: `Your Application for ${owned.job.jobTitle} was declined.`
        });
        return res.json({ message: "Application declined", application: serializeApplication(application) });
    } catch (error) {
        return safeError(res, error, "Application decline failed");
    }
}

export async function completeApplication(req, res) {
    try {
        const owned = await ownedProviderApplication(req, res);
        if (!owned) return undefined;
        const { application } = owned;
        assertApplicationTransition(application.status, "completed", "provider");
        application.status = "completed";
        application.completedAt = new Date();
        await application.save();
        await notifyApplication({
            application,
            recipientType: "student",
            recipientId: application.studentId,
            type: "APPLICATION_COMPLETED",
            message: `Your engagement for ${owned.job.jobTitle} was marked completed.`
        });
        return res.json({ message: "Work marked as completed", application: serializeApplication(application) });
    } catch (error) {
        return safeError(res, error, "Application completion failed");
    }
}
