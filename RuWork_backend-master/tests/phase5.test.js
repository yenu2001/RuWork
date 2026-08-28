import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import Application from "../models/application.js";
import Job from "../models/job.js";
import User from "../models/user.js";
import JobProvider from "../models/jobProvider.js";
import {
    acceptApplication,
    applyToJob,
    cancelMyApplication,
    completeApplication,
    declineApplication,
    getMyApplication,
    listJobApplications,
    serializeApplication,
    withdrawMyApplication
} from "../controllers/applicationController.js";
import { deleteJob } from "../controllers/jobController.js";
import { requireEligibleRuhunaStudent } from "../middlewears/authMiddleware.js";
import { ADMIN_ROLE, JOB_PROVIDER_ROLE, STUDENT_ROLE, UNIVERSITY_NAME } from "../utils/account.js";

function response() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

function student(overrides = {}) {
    return new User({
        _id: new mongoose.Types.ObjectId(), firstName: "Ruhuna", lastName: "Student",
        email: "student@ruh.ac.lk", phoneNumber: "0712345678", dateOfBirth: "2002-01-01",
        gender: "Prefer not to say", password: "hashed-password", university: UNIVERSITY_NAME,
        faculty: "Science", fieldOfStudy: "Computer Science", yearOfStudy: "2nd Year",
        isEmailVerified: true, accountStatus: "approved", ...overrides
    });
}

function provider(overrides = {}) {
    return new JobProvider({
        _id: new mongoose.Types.ObjectId(), companyName: "ABC Technologies", companyEmail: "jobs@abc.example",
        phoneNumber: "0712345678", companyAddress: "Matara", companySize: "11-50", industry: "Technology",
        companyDescription: "A trusted technology company.", firstName: "Test", lastName: "Provider",
        password: "hashed-password", isEmailVerified: true, accountStatus: "approved", ...overrides
    });
}

function job(ownerId, overrides = {}) {
    return new Job({
        _id: new mongoose.Types.ObjectId(), jobProviderId: ownerId, companyName: "ABC Technologies",
        jobTitle: "Data Entry Assistant", jobDescription: "Support a small verified data entry project.",
        category: "Data Entry", requiredSkills: ["Excel"], scope: "Complete one checked workbook.",
        location: "Remote", workingHours: "Flexible", suitableFor: "Any Year",
        applicationDeadline: new Date(Date.now() + 86400000), budgetType: "fixed", budget: 8000,
        status: "open", ...overrides
    });
}

function application(jobDocument, studentDocument, overrides = {}) {
    const budgetType = overrides.budgetType || jobDocument.budgetType;
    const data = {
        _id: new mongoose.Types.ObjectId(), jobId: jobDocument._id, studentId: studentDocument._id,
        jobProviderId: jobDocument.jobProviderId, applicationNote: "I have relevant experience and would like to help with this work.",
        status: "pending_review", budgetType,
        originalHourlyRate: budgetType === "hourly" ? (jobDocument.hourlyRate || 1500) : undefined,
        originalBudget: budgetType === "fixed" ? (jobDocument.budget || 8000) : undefined,
        ...overrides
    };
    return new Application(data);
}

function studentRequest(studentDocument, body = {}) {
    return { body, studentAccount: studentDocument };
}

function providerRequest(providerDocument, id, body = {}) {
    return { params: { id }, body, jobProviderAccount: providerDocument };
}

async function withApplicationSave(run) {
    const original = Application.prototype.save;
    Application.prototype.save = async function saveWithoutDatabase() { await this.validate(); return this; };
    try { return await run(); } finally { Application.prototype.save = original; }
}

async function withOwnedProviderApplication(applicationDocument, jobDocument, run) {
    const originalApplicationFind = Application.findById;
    const originalJobFind = Job.findById;
    Application.findById = () => ({ populate: async () => applicationDocument });
    Job.findById = async () => jobDocument;
    applicationDocument.save = async function saveWithoutDatabase() { await this.validate(); return this; };
    try { return await run(); } finally { Application.findById = originalApplicationFind; Job.findById = originalJobFind; }
}

test("Application schema has a unique Job/Student index and unambiguous pricing", async () => {
    const providerDocument = provider();
    const studentDocument = student();
    const fixed = application(job(providerDocument._id), studentDocument);
    await fixed.validate();
    assert.equal(fixed.originalBudget, 8000);
    assert.equal(fixed.originalHourlyRate, undefined);

    const hourlyJob = job(providerDocument._id, { budgetType: "hourly", hourlyRate: 1400, budget: undefined });
    const hourly = application(hourlyJob, studentDocument, { budgetType: "hourly" });
    await hourly.validate();
    assert.equal(hourly.originalHourlyRate, 1400);
    assert.equal(hourly.originalBudget, undefined);

    const uniqueIndex = Application.schema.indexes().find(([fields, options]) => fields.jobId === 1 && fields.studentId === 1 && options.unique);
    assert.ok(uniqueIndex);
});

test("approved Student applies with authoritative identity, initial state, and Job price snapshot", async () => {
    const providerDocument = provider();
    const studentDocument = student();
    const jobDocument = job(providerDocument._id);
    const originalJobFind = Job.findOne;
    const originalApplicationFind = Application.findOne;
    Job.findOne = async () => jobDocument;
    Application.findOne = () => ({ lean() { return this; }, async exec() { return null; } });
    try {
        await withApplicationSave(async () => {
            const res = response();
            await applyToJob({ ...studentRequest(studentDocument, { applicationNote: "I can complete this work carefully and on schedule." }), params: { jobId: jobDocument._id.toString() } }, res);
            assert.equal(res.statusCode, 201);
            assert.equal(res.body.application.status, "pending_review");
            assert.equal(res.body.application.originalBudget, 8000);
            assert.equal(res.body.application.approvedBudget, null);
        });
    } finally { Job.findOne = originalJobFind; Application.findOne = originalApplicationFind; }
});

test("Application creation rejects client identity, status, and agreed-price spoofing", async () => {
    const studentDocument = student();
    for (const field of ["studentId", "status", "approvedBudget", "jobProviderId"]) {
        const res = response();
        await applyToJob({ ...studentRequest(studentDocument, { applicationNote: "I have relevant experience for this available opportunity.", [field]: "spoofed" }), params: { jobId: new mongoose.Types.ObjectId().toString() } }, res);
        assert.equal(res.statusCode, 400, `${field} should be rejected`);
    }
});

test("draft, closed, expired, and archived Jobs reject new Applications", async () => {
    const providerDocument = provider();
    const studentDocument = student();
    const originalJobFind = Job.findOne;
    try {
        for (const variant of [
            { status: "draft" }, { status: "closed" },
            { applicationDeadline: new Date(Date.now() - 1000) }, { archivedAt: new Date() }
        ]) {
            Job.findOne = async () => variant.archivedAt ? null : job(providerDocument._id, variant);
            const res = response();
            await applyToJob({ ...studentRequest(studentDocument, { applicationNote: "I have relevant experience for this available opportunity." }), params: { jobId: new mongoose.Types.ObjectId().toString() } }, res);
            assert.ok([404, 409].includes(res.statusCode));
        }
    } finally { Job.findOne = originalJobFind; }
});

test("duplicate Application is rejected before create and database duplicates map to 409", async () => {
    const providerDocument = provider();
    const studentDocument = student();
    const jobDocument = job(providerDocument._id);
    const existing = application(jobDocument, studentDocument);
    const originalJobFind = Job.findOne;
    const originalApplicationFind = Application.findOne;
    const originalSave = Application.prototype.save;
    Job.findOne = async () => jobDocument;
    try {
        Application.findOne = () => ({ lean() { return this; }, async exec() { return existing.toObject(); } });
        const existingResponse = response();
        await applyToJob({ ...studentRequest(studentDocument, { applicationNote: "I have relevant experience for this available opportunity." }), params: { jobId: jobDocument._id.toString() } }, existingResponse);
        assert.equal(existingResponse.statusCode, 409);
        assert.equal(existingResponse.body.code, "APPLICATION_ALREADY_EXISTS");

        Application.findOne = () => ({ lean() { return this; }, async exec() { return null; } });
        Application.prototype.save = async () => { const error = new Error("duplicate"); error.code = 11000; throw error; };
        const raceResponse = response();
        await applyToJob({ ...studentRequest(studentDocument, { applicationNote: "I have relevant experience for this available opportunity." }), params: { jobId: jobDocument._id.toString() } }, raceResponse);
        assert.equal(raceResponse.statusCode, 409);
    } finally { Job.findOne = originalJobFind; Application.findOne = originalApplicationFind; Application.prototype.save = originalSave; }
});

test("authoritative Student eligibility blocks unverified, pending, rejected, Provider, and Admin identities", async () => {
    const originalFind = User.findById;
    try {
        for (const candidate of [
            student({ isEmailVerified: false }), student({ accountStatus: "pending" }), student({ accountStatus: "rejected" }),
            { ...student().toObject(), role: JOB_PROVIDER_ROLE }, { ...student().toObject(), role: ADMIN_ROLE }
        ]) {
            User.findById = async () => candidate;
            const res = response();
            let passed = false;
            await requireEligibleRuhunaStudent({ user: { sub: candidate._id.toString() } }, res, () => { passed = true; });
            assert.equal(passed, false);
            assert.equal(res.statusCode, 403);
        }
    } finally { User.findById = originalFind; }
});

test("only the owning Provider can list applicants", async () => {
    const owner = provider();
    const other = provider();
    const jobDocument = job(owner._id);
    const originalJobFind = Job.findById;
    Job.findById = async () => jobDocument;
    try {
        const res = response();
        await listJobApplications({ params: { jobId: jobDocument._id.toString() }, query: {}, jobProviderAccount: other }, res);
        assert.equal(res.statusCode, 403);
    } finally { Job.findById = originalJobFind; }
});

test("Provider applicant response allowlists Student academic information", () => {
    const providerDocument = provider();
    const studentDocument = student();
    const jobDocument = job(providerDocument._id);
    const value = application(jobDocument, studentDocument).toObject();
    value.studentId = { ...studentDocument.toObject(), password: "must-not-leak", emailVerificationTokenHash: "secret" };
    const serialized = serializeApplication(value);
    assert.equal(serialized.student.firstName, studentDocument.firstName);
    assert.equal(serialized.student.fieldOfStudy, studentDocument.fieldOfStudy);
    assert.equal("password" in serialized.student, false);
    assert.equal("emailVerificationTokenHash" in serialized.student, false);
});

test("Provider accepts fixed and hourly Applications with semantically correct agreed pricing", async () => {
    const providerDocument = provider();
    const studentDocument = student();
    const fixedJob = job(providerDocument._id);
    const fixedApplication = application(fixedJob, studentDocument);
    await withOwnedProviderApplication(fixedApplication, fixedJob, async () => {
        const res = response();
        await acceptApplication(providerRequest(providerDocument, fixedApplication._id.toString(), { approvedBudget: 9000 }), res);
        assert.equal(res.statusCode, 200);
        assert.equal(fixedApplication.status, "in_progress");
        assert.equal(fixedApplication.approvedBudget, 9000);
        assert.equal(fixedApplication.approvedHourlyRate, undefined);
    });

    const hourlyJob = job(providerDocument._id, { budgetType: "hourly", hourlyRate: 1500, budget: undefined });
    const hourlyApplication = application(hourlyJob, studentDocument, { budgetType: "hourly" });
    await withOwnedProviderApplication(hourlyApplication, hourlyJob, async () => {
        const res = response();
        await acceptApplication(providerRequest(providerDocument, hourlyApplication._id.toString(), { approvedHourlyRate: 1750 }), res);
        assert.equal(res.statusCode, 200);
        assert.equal(hourlyApplication.approvedHourlyRate, 1750);
        assert.equal(hourlyApplication.approvedBudget, undefined);
    });
});

test("acceptance rejects zero, negative, and wrong pricing fields", async () => {
    const providerDocument = provider();
    const studentDocument = student();
    for (const body of [{ approvedBudget: 0 }, { approvedBudget: -1 }, { approvedHourlyRate: 1000 }]) {
        const jobDocument = job(providerDocument._id);
        const applicationDocument = application(jobDocument, studentDocument);
        await withOwnedProviderApplication(applicationDocument, jobDocument, async () => {
            const res = response();
            await acceptApplication(providerRequest(providerDocument, applicationDocument._id.toString(), body), res);
            assert.equal(res.statusCode, 400);
            assert.equal(applicationDocument.status, "pending_review");
        });
    }
});

test("Provider may decline only pending Applications and cannot decide another Provider's Application", async () => {
    const owner = provider();
    const other = provider();
    const studentDocument = student();
    const jobDocument = job(owner._id);
    const pending = application(jobDocument, studentDocument);
    await withOwnedProviderApplication(pending, jobDocument, async () => {
        const forbidden = response();
        await declineApplication(providerRequest(other, pending._id.toString()), forbidden);
        assert.equal(forbidden.statusCode, 403);
        const allowed = response();
        await declineApplication(providerRequest(owner, pending._id.toString(), { declineReason: "We selected another candidate." }), allowed);
        assert.equal(allowed.statusCode, 200);
        assert.equal(pending.status, "declined");
    });
});

test("Provider completes in-progress work but cannot complete declined work", async () => {
    const providerDocument = provider();
    const studentDocument = student();
    const jobDocument = job(providerDocument._id);
    const inProgress = application(jobDocument, studentDocument, { status: "in_progress", approvedBudget: 8500 });
    await withOwnedProviderApplication(inProgress, jobDocument, async () => {
        const res = response();
        await completeApplication(providerRequest(providerDocument, inProgress._id.toString()), res);
        assert.equal(res.statusCode, 200);
        assert.equal(inProgress.status, "completed");
        assert.ok(inProgress.completedAt instanceof Date);
    });
    const declined = application(jobDocument, studentDocument, { status: "declined" });
    await withOwnedProviderApplication(declined, jobDocument, async () => {
        const res = response();
        await completeApplication(providerRequest(providerDocument, declined._id.toString()), res);
        assert.equal(res.statusCode, 409);
    });
});

test("Student withdraws pending Application and cancels accepted in-progress work", async () => {
    const providerDocument = provider();
    const studentDocument = student();
    const jobDocument = job(providerDocument._id);
    const originalFind = Application.findOne;
    try {
        const pending = application(jobDocument, studentDocument);
        pending.save = async function saveWithoutDatabase() { await this.validate(); return this; };
        Application.findOne = async () => pending;
        const withdrawResponse = response();
        await withdrawMyApplication({ params: { id: pending._id.toString() }, body: {}, studentAccount: studentDocument }, withdrawResponse);
        assert.equal(withdrawResponse.statusCode, 200);
        assert.equal(pending.status, "withdrawn");

        const inProgress = application(jobDocument, studentDocument, { status: "in_progress", approvedBudget: 8500 });
        inProgress.save = async function saveWithoutDatabase() { await this.validate(); return this; };
        Application.findOne = async () => inProgress;
        const cancelResponse = response();
        await cancelMyApplication({ params: { id: inProgress._id.toString() }, body: { cancellationReason: "My academic schedule changed." }, studentAccount: studentDocument }, cancelResponse);
        assert.equal(cancelResponse.statusCode, 200);
        assert.equal(inProgress.status, "cancelled");
        assert.equal(inProgress.cancellationReason, "My academic schedule changed.");
    } finally { Application.findOne = originalFind; }
});

test("completed work cannot be withdrawn or cancelled", async () => {
    const providerDocument = provider();
    const studentDocument = student();
    const jobDocument = job(providerDocument._id);
    const completed = application(jobDocument, studentDocument, { status: "completed", approvedBudget: 8500 });
    const originalFind = Application.findOne;
    Application.findOne = async () => completed;
    try {
        const res = response();
        await cancelMyApplication({ params: { id: completed._id.toString() }, body: {}, studentAccount: studentDocument }, res);
        assert.equal(res.statusCode, 409);
    } finally { Application.findOne = originalFind; }
});

test("Student cannot view another Student's Application", async () => {
    const originalFind = Application.findOne;
    Application.findOne = () => ({ populate() { return this; }, lean() { return this; }, async exec() { return null; } });
    try {
        const res = response();
        await getMyApplication({ params: { id: new mongoose.Types.ObjectId().toString() }, studentAccount: student() }, res);
        assert.equal(res.statusCode, 404);
    } finally { Application.findOne = originalFind; }
});

test("Option B Job deletion archives and preserves Application references", async () => {
    const providerDocument = provider();
    const studentDocument = student();
    const jobDocument = job(providerDocument._id);
    const applicationDocument = application(jobDocument, studentDocument);
    const originalFind = Job.findById;
    Job.findById = async () => jobDocument;
    jobDocument.save = async function saveWithoutDatabase() { await this.validate(); return this; };
    try {
        const res = response();
        await deleteJob({ params: { id: jobDocument._id.toString() }, jobProviderAccount: providerDocument }, res);
        assert.equal(res.statusCode, 200);
        assert.ok(jobDocument.archivedAt instanceof Date);
        assert.equal(jobDocument.status, "closed");
        assert.equal(applicationDocument.jobId.toString(), jobDocument._id.toString());
    } finally { Job.findById = originalFind; }
});

test("completed Application retains Student, Job, Provider, and agreed price for future Review eligibility", async () => {
    const providerDocument = provider();
    const studentDocument = student();
    const jobDocument = job(providerDocument._id);
    const completed = application(jobDocument, studentDocument, { status: "completed", approvedBudget: 9000, completedAt: new Date() });
    await completed.validate();
    assert.equal(completed.studentId.toString(), studentDocument._id.toString());
    assert.equal(completed.jobId.toString(), jobDocument._id.toString());
    assert.equal(completed.jobProviderId.toString(), providerDocument._id.toString());
    assert.equal(completed.approvedBudget, 9000);
});
