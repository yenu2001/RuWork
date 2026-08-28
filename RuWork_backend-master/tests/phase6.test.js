import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import Application from "../models/application.js";
import Job from "../models/job.js";
import JobProvider from "../models/jobProvider.js";
import User from "../models/user.js";
import { serializeApplication } from "../controllers/applicationController.js";
import { getAdminDashboard } from "../controllers/adminController.js";
import {
    getMyCompanyProfile,
    getProviderDashboard,
    updateMyCompanyProfile
} from "../controllers/jobProviderController.js";
import {
    getMyProfile,
    getStudentDashboard,
    getStudentJobHistory,
    updateMyProfile
} from "../controllers/userController.js";
import adminRouter from "../routes/adminRouter.js";
import jobProviderRouter from "../routes/jobProviderRouter.js";
import userRouter from "../routes/userRouter.js";
import { UNIVERSITY_NAME } from "../utils/account.js";

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

function queryResult(result) {
    return {
        sort() { return this; }, skip() { return this; }, limit() { return this; },
        populate() { return this; }, lean() { return this; }, async exec() { return result; }
    };
}

function routeExists(router, method, path) {
    return router.stack.some((layer) => layer.route?.path === path && layer.route.methods?.[method]);
}

test("Student self profile is allowlisted and immutable identity fields are rejected", async () => {
    const account = student();
    account.save = async () => account;
    const getResponse = response();
    getMyProfile({ studentAccount: account }, getResponse);
    assert.equal(getResponse.body.profile.email, "student@ruh.ac.lk");
    assert.equal(getResponse.body.profile.password, undefined);

    const updateResponse = response();
    await updateMyProfile({ studentAccount: account, body: { firstName: "  Nimal  ", yearOfStudy: "3rd Year" } }, updateResponse);
    assert.equal(updateResponse.body.profile.firstName, "Nimal");
    assert.equal(updateResponse.body.profile.yearOfStudy, "3rd Year");

    const protectedResponse = response();
    await updateMyProfile({ studentAccount: account, body: { email: "other@ruh.ac.lk" } }, protectedResponse);
    assert.equal(protectedResponse.statusCode, 400);
});

test("Provider rename synchronizes every owned Job with the current company name", async () => {
    const account = provider();
    account.save = async () => account;
    const originalUpdateMany = Job.updateMany;
    let update;
    Job.updateMany = async (filter, operation) => { update = { filter, operation }; return { modifiedCount: 4 }; };
    try {
        const res = response();
        await updateMyCompanyProfile({ jobProviderAccount: account, body: { companyName: "  Current Name Ltd  " } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.profile.companyName, "Current Name Ltd");
        assert.deepEqual(update.filter, { jobProviderId: account._id });
        assert.deepEqual(update.operation, { $set: { companyName: "Current Name Ltd" } });
        assert.match(res.body.message, /all owned Jobs/i);
    } finally {
        Job.updateMany = originalUpdateMany;
    }
});

test("Provider self profile hides secrets and rejects company-email changes", async () => {
    const account = provider();
    const getResponse = response();
    getMyCompanyProfile({ jobProviderAccount: account }, getResponse);
    assert.equal(getResponse.body.profile.companyEmail, "jobs@abc.example");
    assert.equal(getResponse.body.profile.password, undefined);

    const protectedResponse = response();
    await updateMyCompanyProfile({ jobProviderAccount: account, body: { companyEmail: "new@example.com" } }, protectedResponse);
    assert.equal(protectedResponse.statusCode, 400);
});

test("Student dashboard returns live counts and only year-suitable open Jobs", async () => {
    const account = student();
    const originalApplicationAggregate = Application.aggregate;
    const originalApplicationFind = Application.find;
    const originalJobFind = Job.find;
    let jobFilter;
    Application.aggregate = async () => [{ _id: "pending_review", count: 2 }, { _id: "completed", count: 1 }];
    Application.find = () => queryResult([]);
    Job.find = (filter) => { jobFilter = filter; return queryResult([]); };
    try {
        const res = response();
        await getStudentDashboard({ studentAccount: account }, res);
        assert.deepEqual(res.body.summary, { pendingApplications: 2, inProgress: 0, completedJobs: 1, totalApplications: 3 });
        assert.deepEqual(jobFilter.suitableFor.$in, ["Any Year", "2nd Year"]);
        assert.equal(jobFilter.status, "open");
        assert.equal(jobFilter.archivedAt, null);
    } finally {
        Application.aggregate = originalApplicationAggregate;
        Application.find = originalApplicationFind;
        Job.find = originalJobFind;
    }
});

test("Student Job History is ownership-scoped, terminal-only, filtered, and paginated", async () => {
    const account = student();
    const originalFind = Application.find;
    const originalCount = Application.countDocuments;
    let capturedFilter;
    Application.find = (filter) => { capturedFilter = filter; return queryResult([]); };
    Application.countDocuments = async () => 13;
    try {
        const res = response();
        await getStudentJobHistory({ studentAccount: account, query: { status: "all", page: "2", limit: "10" } }, res);
        assert.deepEqual(capturedFilter.status.$in, ["completed", "cancelled", "declined", "withdrawn"]);
        assert.equal(capturedFilter.studentId.toString(), account._id.toString());
        assert.deepEqual(res.body.pagination, { page: 2, limit: 10, total: 13, pages: 2 });

        const invalidResponse = response();
        await getStudentJobHistory({ studentAccount: account, query: { status: "in_progress" } }, invalidResponse);
        assert.equal(invalidResponse.statusCode, 400);
    } finally {
        Application.find = originalFind;
        Application.countDocuments = originalCount;
    }
});

test("Provider dashboard counts only the authenticated Provider's Jobs and Applications", async () => {
    const account = provider({ companyName: "Current Company" });
    const originalJobAggregate = Job.aggregate;
    const originalApplicationAggregate = Application.aggregate;
    const originalJobFind = Job.find;
    const originalApplicationFind = Application.find;
    let jobPipeline;
    let applicationPipeline;
    Job.aggregate = async (pipeline) => { jobPipeline = pipeline; return [{ _id: "open", count: 3 }]; };
    Application.aggregate = async (pipeline) => { applicationPipeline = pipeline; return [{ _id: "in_progress", count: 2 }, { _id: "completed", count: 1 }]; };
    Job.find = () => queryResult([]);
    Application.find = () => queryResult([]);
    try {
        const res = response();
        await getProviderDashboard({ jobProviderAccount: account }, res);
        assert.deepEqual(res.body.summary, { openJobs: 3, totalApplicants: 3, inProgress: 2, completedEngagements: 1 });
        assert.equal(jobPipeline[0].$match.jobProviderId.toString(), account._id.toString());
        assert.equal(applicationPipeline[0].$match.jobProviderId.toString(), account._id.toString());
    } finally {
        Job.aggregate = originalJobAggregate;
        Application.aggregate = originalApplicationAggregate;
        Job.find = originalJobFind;
        Application.find = originalApplicationFind;
    }
});

test("Admin dashboard combines registration workload and platform totals", async () => {
    const originals = [User.countDocuments, JobProvider.countDocuments, Job.countDocuments];
    let userCall = 0;
    let providerCall = 0;
    User.countDocuments = async () => [4, 40][userCall++];
    JobProvider.countDocuments = async () => [3, 12][providerCall++];
    Job.countDocuments = async () => 9;
    try {
        const res = response();
        await getAdminDashboard({}, res);
        assert.deepEqual(res.body.summary, {
            pendingRegistrations: 7, pendingStudents: 4, pendingProviders: 3,
            totalStudents: 40, totalProviders: 12, openJobs: 9
        });
    } finally {
        [User.countDocuments, JobProvider.countDocuments, Job.countDocuments] = originals;
    }
});

test("Application summaries prefer populated current Provider identity over Job snapshots", () => {
    const serialized = serializeApplication({
        _id: new mongoose.Types.ObjectId(), status: "completed", budgetType: "fixed", originalBudget: 5000,
        jobId: {
            _id: new mongoose.Types.ObjectId(), jobTitle: "Assistant", companyName: "Old Snapshot",
            jobProviderId: { _id: new mongoose.Types.ObjectId(), companyName: "Current Name" },
            category: "Admin", location: "Remote", status: "closed", budgetType: "fixed", budget: 5000
        }
    });
    assert.equal(serialized.job.companyName, "Current Name");
});

test("Phase 6 protected routes are registered for each workspace role", () => {
    assert.ok(routeExists(userRouter, "get", "/dashboard"));
    assert.ok(routeExists(userRouter, "get", "/profile"));
    assert.ok(routeExists(userRouter, "patch", "/profile"));
    assert.ok(routeExists(userRouter, "get", "/job-history"));
    assert.ok(routeExists(jobProviderRouter, "get", "/dashboard"));
    assert.ok(routeExists(jobProviderRouter, "get", "/profile"));
    assert.ok(routeExists(jobProviderRouter, "patch", "/profile"));
    assert.ok(routeExists(adminRouter, "get", "/dashboard"));
});
