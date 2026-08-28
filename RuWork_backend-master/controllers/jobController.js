import mongoose from "mongoose";
import Job from "../models/job.js";
import Application from "../models/application.js";
import {
    JOB_BUDGET_TYPES,
    JOB_CATEGORIES,
    JOB_STATUSES,
    JOB_SUITABLE_YEARS,
    escapeRegex,
    escapeSearchText,
    normalizeSkills
} from "../utils/job.js";
import { getPlatformSettings } from "../utils/admin.js";

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 12;
const EDITABLE_FIELDS = [
    "jobTitle", "jobDescription", "category", "requiredSkills", "scope",
    "location", "workingHours", "suitableFor", "applicationDeadline",
    "budgetType", "hourlyRate", "budget"
];
const SYSTEM_FIELDS = [
    "jobProviderId", "companyName", "currency", "priceAmount",
    "averageRating", "reviewCount", "archivedAt", "createdAt", "updatedAt",
    "moderationStatus", "moderationReason", "moderatedAt", "moderatedBy", "providerSuspendedAt"
];
const SORTS = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    "price-low": { priceAmount: 1, createdAt: -1 },
    "price-high": { priceAmount: -1, createdAt: -1 },
    rating: { averageRating: -1, reviewCount: -1, createdAt: -1 }
};

class JobInputError extends Error {}

function getObject(document) {
    return typeof document?.toObject === "function"
        ? document.toObject({ getters: false, virtuals: false })
        : document;
}

function identifier(value) {
    if (typeof value === "string") return value;
    if (typeof value?.toHexString === "function") return value.toHexString();
    if (value?._id && value._id !== value) return identifier(value._id);
    return value?.toString?.();
}

function getProviderSummary(job) {
    const provider = job.jobProviderId && typeof job.jobProviderId === "object" &&
        "companyName" in job.jobProviderId ? job.jobProviderId : null;
    return {
        companyName: provider?.companyName || job.companyName,
        ...(provider?.industry ? { industry: provider.industry } : {}),
        ...(provider?.companyWebsite ? { companyWebsite: provider.companyWebsite } : {}),
        averageRating: provider?.averageRating ?? null,
        reviewCount: provider?.reviewCount || 0
    };
}

export function getAvailabilityStatus(job, now = new Date()) {
    if (job.status === "open" && new Date(job.applicationDeadline) <= now) return "expired";
    return job.status;
}

export function serializeJobSummary(document, now = new Date(), { includeModeration = false } = {}) {
    const job = getObject(document);
    const provider = getProviderSummary(job);
    return {
        id: identifier(job._id || job.id),
        jobTitle: job.jobTitle,
        companyName: provider.companyName,
        category: job.category,
        location: job.location,
        requiredSkills: job.requiredSkills || [],
        suitableFor: job.suitableFor,
        budgetType: job.budgetType,
        hourlyRate: job.budgetType === "hourly" ? job.hourlyRate : undefined,
        budget: job.budgetType === "fixed" ? job.budget : undefined,
        currency: job.currency || "LKR",
        applicationDeadline: job.applicationDeadline,
        status: job.status,
        availabilityStatus: getAvailabilityStatus(job, now),
        averageRating: job.averageRating ?? null,
        reviewCount: job.reviewCount || 0,
        ...(includeModeration ? {
            moderationStatus: job.moderationStatus || "visible",
            moderationReason: job.moderationReason,
            moderatedAt: job.moderatedAt,
            providerSuspended: Boolean(job.providerSuspendedAt)
        } : {}),
        ...(Number.isInteger(job.applicationCount) ? { applicationCount: job.applicationCount } : {}),
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
    };
}

export function serializeJobDetails(document, now = new Date(), options = {}) {
    const job = getObject(document);
    return {
        ...serializeJobSummary(job, now, options),
        jobDescription: job.jobDescription,
        scope: job.scope,
        workingHours: job.workingHours,
        provider: getProviderSummary(job)
    };
}

function parseInteger(value, fallback, { minimum = 1, maximum = Number.MAX_SAFE_INTEGER } = {}) {
    if (value === undefined || value === "") return fallback;
    if (!/^\d+$/.test(String(value))) throw new JobInputError("Pagination values must be positive integers");
    const number = Number(value);
    if (number < minimum || number > maximum) {
        throw new JobInputError(`Pagination value must be between ${minimum} and ${maximum}`);
    }
    return number;
}

function parsePrice(value, label) {
    if (value === undefined || value === "") return undefined;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
        throw new JobInputError(`${label} must be a valid non-negative number`);
    }
    return number;
}

function requireShortText(value, label, maximum = 100) {
    if (value === undefined || value === "") return undefined;
    if (typeof value !== "string") throw new JobInputError(`${label} must be text`);
    const normalized = value.trim().replace(/\s+/g, " ");
    if (normalized.length > maximum) throw new JobInputError(`${label} is too long`);
    return normalized;
}

export function buildPublicJobQuery(query = {}, now = new Date()) {
    const filter = {
        archivedAt: null,
        status: "open",
        moderationStatus: { $ne: "hidden" },
        providerSuspendedAt: null,
        applicationDeadline: { $gt: now }
    };
    const search = requireShortText(query.q, "Search", 80);
    const category = requireShortText(query.category, "Category", 80);
    const location = requireShortText(query.location, "Location", 80);
    const skill = requireShortText(query.skill, "Skill", 50);
    const suitableFor = requireShortText(query.suitableFor, "Suitable year", 30);
    const budgetType = requireShortText(query.budgetType, "Budget type", 20);
    const minPrice = parsePrice(query.minPrice, "Minimum price");
    const maxPrice = parsePrice(query.maxPrice, "Maximum price");

    if (search) filter.$text = { $search: escapeSearchText(search) };
    if (category) {
        if (!JOB_CATEGORIES.includes(category)) throw new JobInputError("Invalid Job category");
        filter.category = category;
    }
    if (location) filter.location = { $regex: escapeRegex(location), $options: "i" };
    if (skill) filter.requiredSkills = { $regex: `^${escapeRegex(skill)}$`, $options: "i" };
    if (suitableFor) {
        if (!JOB_SUITABLE_YEARS.includes(suitableFor)) throw new JobInputError("Invalid suitable year");
        filter.suitableFor = suitableFor;
    }
    if (budgetType) {
        if (!JOB_BUDGET_TYPES.includes(budgetType)) throw new JobInputError("Invalid budget type");
        filter.budgetType = budgetType;
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
        if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
            throw new JobInputError("Minimum price cannot exceed maximum price");
        }
        filter.priceAmount = {
            ...(minPrice !== undefined ? { $gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { $lte: maxPrice } : {})
        };
    }
    return filter;
}

export function getListOptions(query = {}, defaultLimit = DEFAULT_PAGE_SIZE) {
    const page = parseInteger(query.page, 1);
    const limit = parseInteger(query.limit, defaultLimit, { maximum: MAX_PAGE_SIZE });
    const sortName = query.sort || "newest";
    if (typeof sortName !== "string" || !SORTS[sortName]) {
        throw new JobInputError("Invalid Job sort option");
    }
    return { page, limit, sortName, sort: SORTS[sortName] };
}

function assertNoSystemFields(body = {}) {
    const supplied = SYSTEM_FIELDS.find((field) => Object.hasOwn(body, field));
    if (supplied) throw new JobInputError(`${supplied} cannot be set by the client`);
}

function buildEditablePayload(body = {}) {
    const payload = {};
    for (const field of EDITABLE_FIELDS) {
        if (!Object.hasOwn(body, field)) continue;
        if (field === "requiredSkills") {
            if (!Array.isArray(body.requiredSkills)) throw new JobInputError("Required skills must be an array");
            payload.requiredSkills = normalizeSkills(body.requiredSkills);
        } else if (["hourlyRate", "budget"].includes(field)) {
            payload[field] = body[field] === "" || body[field] === null ? undefined : Number(body[field]);
        } else if (typeof body[field] === "string") {
            payload[field] = body[field].trim();
        } else {
            payload[field] = body[field];
        }
    }
    return payload;
}

function assertFutureOpenDeadline(job) {
    if (job.status === "open" && new Date(job.applicationDeadline) <= new Date()) {
        throw new JobInputError("An open Job requires a future application deadline");
    }
}

function assertStatusTransition(currentStatus, nextStatus) {
    const transitions = {
        draft: ["draft", "open"],
        open: ["open", "closed"],
        closed: ["closed", "open"]
    };
    if (!JOB_STATUSES.includes(nextStatus) || !transitions[currentStatus]?.includes(nextStatus)) {
        throw new JobInputError(`A Job cannot transition from ${currentStatus} to ${nextStatus}`);
    }
}

function getSafeValidationMessage(error) {
    if (error instanceof JobInputError) return error.message;
    if (error?.name === "ValidationError") {
        return Object.values(error.errors || {})[0]?.message || "Job information is invalid";
    }
    if (error?.name === "CastError") return "Job information has an invalid value";
    return null;
}

function sendJobError(res, error, fallback) {
    const validationMessage = getSafeValidationMessage(error);
    return res.status(validationMessage ? 400 : 500).json({ error: validationMessage || fallback });
}

function providerId(req) {
    return identifier(req.jobProviderAccount?._id);
}

function ownsJob(job, req) {
    return identifier(job.jobProviderId) === providerId(req);
}

export async function createJob(req, res) {
    try {
        const settings = await getPlatformSettings();
        if (!settings.jobPostingOpen) {
            return res.status(403).json({ error: "New Job posting is currently closed", code: "JOB_POSTING_CLOSED" });
        }
        assertNoSystemFields(req.body);
        const payload = buildEditablePayload(req.body);
        const requestedStatus = req.body?.status === undefined ? "open" : req.body.status;
        if (!["draft", "open"].includes(requestedStatus)) {
            throw new JobInputError("A new Job can only be saved as draft or open");
        }
        const job = new Job({
            ...payload,
            jobProviderId: providerId(req),
            companyName: req.jobProviderAccount.companyName,
            status: requestedStatus,
            currency: "LKR"
        });
        assertFutureOpenDeadline(job);
        await job.save();
        return res.status(201).json({
            message: job.status === "draft" ? "Job saved as draft" : "Job published successfully",
            job: serializeJobDetails(job)
        });
    } catch (error) {
        return sendJobError(res, error, "Job creation failed");
    }
}

export async function listJobs(req, res) {
    try {
        const filter = buildPublicJobQuery(req.query);
        const { page, limit, sortName, sort } = getListOptions(req.query);
        const [jobs, total] = await Promise.all([
            Job.find(filter)
                .select("jobTitle companyName category location requiredSkills suitableFor budgetType hourlyRate budget currency applicationDeadline status averageRating reviewCount createdAt updatedAt jobProviderId")
                .sort(sort).skip((page - 1) * limit).limit(limit)
                .populate({ path: "jobProviderId", select: "companyName industry companyWebsite averageRating reviewCount" })
                .lean().exec(),
            Job.countDocuments(filter)
        ]);
        return res.json({
            jobs: jobs.map((job) => serializeJobSummary(job)),
            pagination: { page, limit, total, pages: total === 0 ? 0 : Math.ceil(total / limit) },
            sort: sortName
        });
    } catch (error) {
        return sendJobError(res, error, "Job listing failed");
    }
}

export async function getJob(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Job not found" });
        const job = await Job.findOne({
            _id: req.params.id,
            archivedAt: null,
            status: { $ne: "draft" },
            moderationStatus: { $ne: "hidden" },
            providerSuspendedAt: null
        })
            .populate({ path: "jobProviderId", select: "companyName industry companyWebsite averageRating reviewCount" })
            .lean().exec();
        if (!job) return res.status(404).json({ error: "Job not found" });
        return res.json({ job: serializeJobDetails(job) });
    } catch (error) {
        return res.status(500).json({ error: "Job lookup failed" });
    }
}

export async function listMyJobs(req, res) {
    try {
        const { page, limit } = getListOptions(req.query, 20);
        const status = req.query?.status || "all";
        if (!["all", ...JOB_STATUSES].includes(status)) throw new JobInputError("Invalid Job status filter");
        const filter = { jobProviderId: providerId(req), archivedAt: null, ...(status === "all" ? {} : { status }) };
        const [jobs, total] = await Promise.all([
            Job.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
            Job.countDocuments(filter)
        ]);
        const jobIds = jobs.map((job) => job._id);
        const counts = jobIds.length ? await Application.aggregate([
            { $match: { jobId: { $in: jobIds } } },
            { $group: { _id: "$jobId", count: { $sum: 1 } } }
        ]) : [];
        const countByJob = new Map(counts.map((item) => [identifier(item._id), item.count]));
        return res.json({
            jobs: jobs.map((job) => serializeJobSummary({
                ...job,
                companyName: req.jobProviderAccount.companyName,
                applicationCount: countByJob.get(identifier(job._id)) || 0
            }, new Date(), { includeModeration: true })),
            pagination: { page, limit, total, pages: total === 0 ? 0 : Math.ceil(total / limit) }
        });
    } catch (error) {
        return sendJobError(res, error, "Provider Job listing failed");
    }
}

export async function getMyJob(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Job not found" });
        const job = await Job.findOne({ _id: req.params.id, jobProviderId: providerId(req), archivedAt: null }).lean().exec();
        if (!job) return res.status(404).json({ error: "Job not found" });
        return res.json({ job: serializeJobDetails({ ...job, companyName: req.jobProviderAccount.companyName }, new Date(), { includeModeration: true }) });
    } catch (error) {
        return res.status(500).json({ error: "Job lookup failed" });
    }
}

export async function updateJob(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Job not found" });
        assertNoSystemFields(req.body);
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ error: "Job not found" });
        if (!ownsJob(job, req)) return res.status(403).json({ error: "You may manage only your own Jobs" });
        if (job.archivedAt) return res.status(404).json({ error: "Job not found" });

        const payload = buildEditablePayload(req.body);
        if (Object.hasOwn(req.body || {}, "status")) {
            const nextStatus = String(req.body.status).toLowerCase();
            assertStatusTransition(job.status, nextStatus);
            payload.status = nextStatus;
        }
        if (Object.keys(payload).length === 0) throw new JobInputError("Provide at least one editable Job field");
        Object.assign(job, payload, { companyName: req.jobProviderAccount.companyName });
        assertFutureOpenDeadline(job);
        await job.save();
        return res.json({ message: "Job updated successfully", job: serializeJobDetails(job) });
    } catch (error) {
        return sendJobError(res, error, "Job update failed");
    }
}

export async function deleteJob(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Job not found" });
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ error: "Job not found" });
        if (!ownsJob(job, req)) return res.status(403).json({ error: "You may delete only your own Jobs" });
        if (job.archivedAt) return res.status(404).json({ error: "Job not found" });
        job.status = "closed";
        job.archivedAt = new Date();
        await job.save();
        return res.json({ message: "Job archived successfully" });
    } catch (error) {
        return res.status(500).json({ error: "Job deletion failed" });
    }
}

export { JobInputError };
