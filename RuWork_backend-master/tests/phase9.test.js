import assert from "node:assert/strict";
import test from "node:test";
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
    approveRegistration,
    getAdminDashboard,
    listAdminAudits,
    listRegistrations,
    moderateJob,
    moderateProvider,
    moderateReview,
    moderateStudent,
    updateAdminSettings
} from "../controllers/adminController.js";
import { buildPublicJobQuery, createJob, updateJob } from "../controllers/jobController.js";
import { listJobReviews } from "../controllers/reviewController.js";
import { registerUser } from "../controllers/userController.js";
import { requireAdminAccount, requireApprovedJobProvider, requireEligibleRuhunaStudent } from "../middlewears/authMiddleware.js";
import adminRouter from "../routes/adminRouter.js";
import { UNIVERSITY_NAME } from "../utils/account.js";

function response() {
    return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

function queryResult(result) {
    return {
        sort() { return this; }, skip() { return this; }, limit() { return this; }, select() { return this; },
        populate() { return this; }, lean() { return this; }, async exec() { return result; }
    };
}

function student(overrides = {}) {
    return new User({
        _id: new mongoose.Types.ObjectId(), firstName: "Ruhuna", lastName: "Student", email: "student@ruh.ac.lk",
        phoneNumber: "0712345678", dateOfBirth: "2002-01-01", gender: "Prefer not to say", password: "hashed",
        university: UNIVERSITY_NAME, faculty: "Science", fieldOfStudy: "Computer Science", yearOfStudy: "2nd Year",
        isEmailVerified: true, accountStatus: "approved", ...overrides
    });
}

function provider(overrides = {}) {
    return new JobProvider({
        _id: new mongoose.Types.ObjectId(), companyName: "Current Company", companyEmail: "jobs@example.com",
        phoneNumber: "0712345678", companyAddress: "Matara", companySize: "11-50", industry: "Technology",
        companyDescription: "A trusted provider.", firstName: "Test", lastName: "Provider", password: "hashed",
        isEmailVerified: true, accountStatus: "approved", ...overrides
    });
}

function job(owner, overrides = {}) {
    return new Job({
        _id: new mongoose.Types.ObjectId(), jobProviderId: owner._id, jobTitle: "Research Assistant",
        companyName: owner.companyName, jobDescription: "Support a research project.", category: "Data Entry",
        scope: "Prepare one dataset.", location: "Matara", budgetType: "fixed", budget: 8000,
        workingHours: "Flexible", requiredSkills: ["Research"], suitableFor: "2nd Year",
        applicationDeadline: new Date(Date.now() + 86400000), status: "open", ...overrides
    });
}

function review(value = {}) {
    return new Review({
        _id: new mongoose.Types.ObjectId(), applicationId: new mongoose.Types.ObjectId(), jobId: new mongoose.Types.ObjectId(),
        studentId: new mongoose.Types.ObjectId(), jobProviderId: new mongoose.Types.ObjectId(), rating: 5,
        comment: "Professional engagement.", ...value
    });
}

function routeExists(method, path) {
    return adminRouter.stack.some((layer) => layer.route?.path === path && layer.route.methods?.[method]);
}

test("Phase 9 schemas provide reversible moderation, typed Settings, and immutable bounded audits", async () => {
    assert.equal(student().moderationStatus, "active");
    assert.equal(provider().moderationStatus, "active");
    assert.equal(job(provider()).moderationStatus, "visible");
    assert.equal(review().moderationStatus, "active");
    const settings = new PlatformSetting({ updatedBy: new mongoose.Types.ObjectId() });
    assert.equal(settings.studentRegistrationOpen, true);
    assert.equal(settings.providerRegistrationOpen, true);
    assert.equal(settings.jobPostingOpen, true);
    const audit = new AdminAudit({ adminId: new mongoose.Types.ObjectId(), action: "JOB_HIDDEN", entityType: "job", entityId: new mongoose.Types.ObjectId(), metadata: { reason: "Unsafe listing" } });
    await audit.validate();
    assert.equal(AdminAudit.schema.path("action").options.immutable, true);
    assert.ok(AdminAudit.schema.indexes().some(([fields]) => fields.createdAt === -1));
});

test("authoritative Admin middleware rejects missing, Student, and Provider records but accepts a real Admin", async () => {
    const original = Admin.findById;
    try {
        for (const account of [null, student(), provider()]) {
            Admin.findById = async () => account;
            const res = response();
            let continued = false;
            await requireAdminAccount({ user: { sub: new mongoose.Types.ObjectId() } }, res, () => { continued = true; });
            assert.equal(continued, false);
            assert.equal(res.statusCode, 403);
        }
        Admin.findById = async () => ({ _id: new mongoose.Types.ObjectId(), role: "admin" });
        const req = { user: { sub: new mongoose.Types.ObjectId() } };
        const res = response();
        let continued = false;
        await requireAdminAccount(req, res, () => { continued = true; });
        assert.equal(continued, true);
        assert.equal(req.adminAccount.role, "admin");
    } finally { Admin.findById = original; }
});

test("Admin Dashboard returns authoritative status groups without private Message content", async () => {
    const originals = [User.countDocuments, JobProvider.countDocuments, Job.countDocuments, Application.countDocuments, Review.countDocuments, Message.countDocuments, Notification.countDocuments, AdminAudit.find];
    User.countDocuments = async (filter) => filter.accountStatus === "pending" ? 2 : filter.accountStatus === "approved" ? 8 : filter.accountStatus === "rejected" ? 1 : filter.moderationStatus ? 1 : 11;
    JobProvider.countDocuments = async (filter) => filter.accountStatus === "pending" ? 3 : filter.accountStatus === "approved" ? 5 : filter.accountStatus === "rejected" ? 1 : filter.moderationStatus ? 1 : 9;
    Job.countDocuments = async (filter) => filter.applicationDeadline ? 4 : filter.status === "draft" ? 2 : filter.status === "closed" ? 7 : filter.archivedAt ? 5 : filter.moderationStatus ? 3 : 20;
    Application.countDocuments = async (filter) => ({ pending_review: 4, in_progress: 3, declined: 2, withdrawn: 1, completed: 6, cancelled: 1 })[filter.status] || 0;
    Review.countDocuments = async (filter) => filter.moderationStatus === "hidden" ? 2 : filter.moderationStatus ? 10 : 12;
    Message.countDocuments = async () => 30;
    Notification.countDocuments = async () => 40;
    AdminAudit.find = () => queryResult([]);
    try {
        const res = response();
        await getAdminDashboard({}, res);
        assert.equal(res.body.statistics.accounts.students.approved, 8);
        assert.equal(res.body.statistics.jobs.hidden, 3);
        assert.equal(res.body.statistics.applications.completed, 6);
        assert.deepEqual(res.body.statistics.communication, { messages: 30, notifications: 40 });
        assert.equal(JSON.stringify(res.body).includes("content"), false);
    } finally { [User.countDocuments, JobProvider.countDocuments, Job.countDocuments, Application.countDocuments, Review.countDocuments, Message.countDocuments, Notification.countDocuments, AdminAudit.find] = originals; }
});

test("registration approval creates a server-authored audit without exposing client identity", async () => {
    const account = student({ accountStatus: "pending" });
    account.save = async function save() { return this; };
    const originals = [User.findById, AdminAudit.create];
    let created;
    User.findById = async () => account;
    AdminAudit.create = async (value) => { created = value; return value; };
    const adminId = new mongoose.Types.ObjectId();
    try {
        const res = response();
        await approveRegistration({ params: { type: "student", id: account._id.toString() }, body: {}, user: { sub: adminId.toString() } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(created.adminId, adminId.toString());
        assert.equal(created.action, "REGISTRATION_APPROVED");
        assert.equal(created.metadata.adminId, undefined);
        const spoofed = response();
        account.accountStatus = "pending";
        await approveRegistration({ params: { type: "student", id: account._id.toString() }, body: { reviewedBy: "spoofed" }, user: { sub: adminId.toString() } }, spoofed);
        assert.equal(spoofed.statusCode, 400);
    } finally { [User.findById, AdminAudit.create] = originals; }
});

test("Student moderation is reversible, audited, rejects system fields, and blocks authoritative eligibility", async () => {
    const account = student();
    account.save = async function save() { return this; };
    const originals = [User.findById, AdminAudit.create];
    User.findById = async () => account;
    let audit;
    AdminAudit.create = async (value) => { audit = value; return value; };
    try {
        const req = { params: { id: account._id.toString() }, body: { status: "suspended", reason: "Policy violation" }, user: { sub: new mongoose.Types.ObjectId().toString() } };
        const res = response();
        await moderateStudent(req, res);
        assert.equal(account.moderationStatus, "suspended");
        assert.equal(audit.action, "STUDENT_SUSPENDED");
        const blocked = response();
        let continued = false;
        await requireEligibleRuhunaStudent({ user: { sub: account._id } }, blocked, () => { continued = true; });
        assert.equal(continued, false);
        assert.equal(blocked.statusCode, 403);
        const spoofed = response();
        await moderateStudent({ ...req, body: { status: "active", role: "admin" } }, spoofed);
        assert.equal(spoofed.statusCode, 400);
    } finally { [User.findById, AdminAudit.create] = originals; }
});

test("Provider suspension is audited, blocks protected access, and hides owned Jobs without deleting history", async () => {
    const account = provider();
    account.save = async function save() { return this; };
    const originals = [JobProvider.findById, Job.updateMany, AdminAudit.create];
    JobProvider.findById = async () => account;
    let jobUpdate;
    Job.updateMany = async (filter, update) => { jobUpdate = { filter, update }; return { modifiedCount: 2 }; };
    AdminAudit.create = async (value) => value;
    try {
        const res = response();
        await moderateProvider({ params: { id: account._id.toString() }, body: { status: "suspended", reason: "Provider compliance review" }, user: { sub: new mongoose.Types.ObjectId().toString() } }, res);
        assert.equal(res.statusCode, 200);
        assert.ok(jobUpdate.update.$set.providerSuspendedAt instanceof Date);
        assert.equal("deleteMany" in jobUpdate, false);
        const blocked = response();
        let continued = false;
        await requireApprovedJobProvider({ user: { sub: account._id } }, blocked, () => { continued = true; });
        assert.equal(continued, false);
    } finally { [JobProvider.findById, Job.updateMany, AdminAudit.create] = originals; }
});

test("Job moderation is reversible and Provider edits cannot override system moderation", async () => {
    const owner = provider();
    const stored = job(owner);
    stored.save = async function save() { return this; };
    stored.populate = async function populate() { return this; };
    const originals = [Job.findById, AdminAudit.create];
    Job.findById = async () => stored;
    AdminAudit.create = async (value) => value;
    try {
        const adminResponse = response();
        await moderateJob({ params: { id: stored._id.toString() }, body: { status: "hidden", reason: "Unsafe Job content" }, user: { sub: new mongoose.Types.ObjectId().toString() } }, adminResponse);
        assert.equal(stored.moderationStatus, "hidden");
        assert.equal(adminResponse.statusCode, 200);
        const providerResponse = response();
        await updateJob({ params: { id: stored._id.toString() }, body: { moderationStatus: "visible" }, jobProviderAccount: owner }, providerResponse);
        assert.equal(providerResponse.statusCode, 400);
        assert.equal(stored.moderationStatus, "hidden");
    } finally { [Job.findById, AdminAudit.create] = originals; }
});

test("public Job visibility excludes individually moderated and suspended-Provider Jobs", () => {
    const filter = buildPublicJobQuery({});
    assert.deepEqual(filter.moderationStatus, { $ne: "hidden" });
    assert.equal(filter.providerSuspendedAt, null);
});

test("Review moderation recalculates aggregates, remains auditable, and public listing excludes hidden Reviews", async () => {
    const stored = review();
    stored.save = async function save() { return this; };
    stored.populate = async function populate() { return this; };
    const originals = [Review.findById, Review.aggregate, Review.find, Review.countDocuments, Job.updateOne, JobProvider.updateOne, AdminAudit.create];
    Review.findById = async () => stored;
    const matches = [];
    Review.aggregate = async (pipeline) => { matches.push(pipeline[0].$match); return []; };
    Review.find = (filter) => { matches.push(filter); return queryResult([]); };
    Review.countDocuments = async () => 0;
    Job.updateOne = async () => {};
    JobProvider.updateOne = async () => {};
    let audit;
    AdminAudit.create = async (value) => { audit = value; return value; };
    try {
        const res = response();
        await moderateReview({ params: { id: stored._id.toString() }, body: { status: "hidden", reason: "Inappropriate language" }, user: { sub: new mongoose.Types.ObjectId().toString() } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(audit.action, "REVIEW_HIDDEN");
        assert.ok(matches.slice(0, 2).every((match) => match.moderationStatus.$ne === "hidden"));
        await listJobReviews({ params: { jobId: stored.jobId.toString() }, query: {} }, response());
        assert.deepEqual(matches.at(-1).moderationStatus, { $ne: "hidden" });
    } finally { [Review.findById, Review.aggregate, Review.find, Review.countDocuments, Job.updateOne, JobProvider.updateOne, AdminAudit.create] = originals; }
});

test("Settings accept only typed allowlisted business-policy keys and create an audit", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const settings = new PlatformSetting({ _id: new mongoose.Types.ObjectId(), updatedBy: adminId });
    settings.save = async function save() { return this; };
    const originals = [PlatformSetting.findOne, AdminAudit.create];
    PlatformSetting.findOne = async () => settings;
    let audit;
    AdminAudit.create = async (value) => { audit = value; return value; };
    try {
        const res = response();
        await updateAdminSettings({ body: { studentRegistrationOpen: false, jobPostingOpen: false }, user: { sub: adminId.toString() } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(settings.studentRegistrationOpen, false);
        assert.equal(audit.action, "SETTINGS_UPDATED");
        const secret = response();
        await updateAdminSettings({ body: { JWT_SECRET: "not-allowed" }, user: { sub: adminId.toString() } }, secret);
        assert.equal(secret.statusCode, 400);
        const wrongType = response();
        await updateAdminSettings({ body: { jobPostingOpen: "yes" }, user: { sub: adminId.toString() } }, wrongType);
        assert.equal(wrongType.statusCode, 400);
    } finally { [PlatformSetting.findOne, AdminAudit.create] = originals; }
});

test("closed Settings are server-authoritative for Student registration and new Job creation", async () => {
    const original = PlatformSetting.findOne;
    PlatformSetting.findOne = () => queryResult({ studentRegistrationOpen: false, providerRegistrationOpen: true, jobPostingOpen: false });
    try {
        const registration = response();
        await registerUser({ body: {} }, registration);
        assert.equal(registration.body.code, "REGISTRATION_CLOSED");
        const creation = response();
        await createJob({ body: {}, jobProviderAccount: provider() }, creation);
        assert.equal(creation.body.code, "JOB_POSTING_CLOSED");
    } finally { PlatformSetting.findOne = original; }
});

test("Audit listing is bounded, Admin-only by route design, and returns server fields only", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const stored = { _id: new mongoose.Types.ObjectId(), adminId: { _id: adminId, firstName: "System", lastName: "Admin", email: "admin@example.com" }, action: "JOB_HIDDEN", entityType: "job", entityId: new mongoose.Types.ObjectId(), metadata: { reason: "Unsafe" }, createdAt: new Date() };
    const originals = [AdminAudit.find, AdminAudit.countDocuments];
    let filter;
    AdminAudit.find = (value) => { filter = value; return queryResult([stored]); };
    AdminAudit.countDocuments = async () => 1;
    try {
        const res = response();
        await listAdminAudits({ query: { page: "1", limit: "20", action: "JOB_HIDDEN", entityType: "job", adminId: "spoofed" } }, res);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(filter, { action: "JOB_HIDDEN", entityType: "job" });
        assert.equal(res.body.audits[0].admin.email, "admin@example.com");
        assert.equal("password" in res.body.audits[0].admin, false);
    } finally { [AdminAudit.find, AdminAudit.countDocuments] = originals; }
});

test("the merged registration queue is bounded, ordered newest-first, and rejects unsafe pagination", async () => {
    const originals = [User.find, JobProvider.find, User.countDocuments, JobProvider.countDocuments];
    const older = student({ _id: new mongoose.Types.ObjectId(), accountStatus: "pending" });
    const newer = provider({ _id: new mongoose.Types.ObjectId(), accountStatus: "pending" });
    older.createdAt = new Date("2026-01-01T00:00:00.000Z");
    newer.createdAt = new Date("2026-06-01T00:00:00.000Z");
    let studentQuery;
    User.find = (value) => { studentQuery = value; return queryResult([older.toObject()]); };
    JobProvider.find = () => queryResult([newer.toObject()]);
    User.countDocuments = async () => 30;
    JobProvider.countDocuments = async () => 12;
    try {
        const listed = response();
        await listRegistrations({ query: { status: "pending", page: "1", limit: "20" } }, listed);
        assert.equal(listed.statusCode, 200);
        assert.deepEqual(studentQuery, { accountStatus: "pending" });
        assert.deepEqual(listed.body.pagination, { page: 1, limit: 20, total: 42, pages: 3 });
        assert.equal(listed.body.registrations[0].type, "jobProvider");
        assert.equal(listed.body.registrations[1].type, "student");
        assert.equal("password" in listed.body.registrations[0], false);

        for (const query of [{ limit: "500" }, { page: "0" }, { page: "201" }, { page: ["2"] }]) {
            const rejected = response();
            await listRegistrations({ query: { status: "pending", ...query } }, rejected);
            assert.equal(rejected.statusCode, 400, JSON.stringify(query));
        }
    } finally { [User.find, JobProvider.find, User.countDocuments, JobProvider.countDocuments] = originals; }
});

test("Phase 9 Admin routes cover every workspace domain without public mutation routes", () => {
    for (const [method, path] of [
        ["get", "/students"], ["patch", "/students/:id/moderation"],
        ["get", "/providers"], ["patch", "/providers/:id/moderation"],
        ["get", "/jobs"], ["patch", "/jobs/:id/moderation"],
        ["patch", "/reviews/:id/moderation"], ["get", "/settings"], ["patch", "/settings"], ["get", "/audits"]
    ]) assert.ok(routeExists(method, path), `${method.toUpperCase()} ${path}`);
    assert.equal(routeExists("post", "/audits"), false);
    assert.equal(routeExists("delete", "/audits/:id"), false);
});
