import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import Application from "../models/application.js";
import Job from "../models/job.js";
import JobProvider from "../models/jobProvider.js";
import Review from "../models/review.js";
import User from "../models/user.js";
import {
    createReview,
    deleteMyReview,
    deleteReviewAsAdmin,
    listAdminReviews,
    listJobReviews,
    listProviderReviews,
    serializeReview
} from "../controllers/reviewController.js";
import { isStudent } from "../middlewears/authMiddleware.js";
import reviewRouter from "../routes/reviewRouter.js";
import adminRouter from "../routes/adminRouter.js";
import jobProviderRouter from "../routes/jobProviderRouter.js";
import jobRouter from "../routes/jobRouter.js";
import { recalculateReviewAggregates } from "../utils/ratingAggregates.js";
import { UNIVERSITY_NAME } from "../utils/account.js";

function response() {
    return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
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
        companyDescription: "Trusted company", firstName: "Jane", lastName: "Owner", password: "hashed",
        isEmailVerified: true, accountStatus: "approved", ...overrides
    });
}

function application(studentDocument, providerDocument, overrides = {}) {
    return new Application({
        _id: new mongoose.Types.ObjectId(), jobId: new mongoose.Types.ObjectId(), studentId: studentDocument._id,
        jobProviderId: providerDocument._id, applicationNote: "I completed this engagement successfully and carefully.",
        status: "completed", budgetType: "fixed", originalBudget: 8000, approvedBudget: 8500,
        completedAt: new Date(), ...overrides
    });
}

function review(applicationDocument, overrides = {}) {
    return new Review({
        _id: new mongoose.Types.ObjectId(), applicationId: applicationDocument._id, jobId: applicationDocument.jobId,
        studentId: applicationDocument.studentId, jobProviderId: applicationDocument.jobProviderId,
        rating: 5, comment: "Clear communication and a well-scoped completed Job.", ...overrides
    });
}

function queryResult(result) {
    return {
        select() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; },
        populate() { return this; }, lean() { return this; }, async exec() { return result; }
    };
}

function routeExists(router, method, path) {
    return router.stack.some((layer) => layer.route?.path === path && layer.route.methods?.[method]);
}

async function withCreateMocks(applicationDocument, run, { existing = false, saveError = null } = {}) {
    const originals = [Application.findById, Job.findById, Review.exists, Review.prototype.save, Review.prototype.populate, Review.aggregate, Job.updateOne, JobProvider.updateOne];
    Application.findById = async () => applicationDocument;
    Job.findById = () => queryResult({ _id: applicationDocument.jobId, jobProviderId: applicationDocument.jobProviderId, archivedAt: new Date() });
    Review.exists = async () => existing;
    Review.prototype.save = async function saveWithoutDatabase() { if (saveError) throw saveError; await this.validate(); return this; };
    Review.prototype.populate = async function populateWithoutDatabase() { return this; };
    Review.aggregate = async () => [{ averageRating: 5, reviewCount: 1 }];
    Job.updateOne = async () => ({ modifiedCount: 1 });
    JobProvider.updateOne = async () => ({ modifiedCount: 1 });
    try { return await run(); } finally {
        [Application.findById, Job.findById, Review.exists, Review.prototype.save, Review.prototype.populate, Review.aggregate, Job.updateOne, JobProvider.updateOne] = originals;
    }
}

test("Review schema enforces one Review per Application and whole ratings from 1 to 5", async () => {
    const studentDocument = student();
    const providerDocument = provider();
    const completed = application(studentDocument, providerDocument);
    await review(completed, { rating: 1 }).validate();
    await review(completed, { rating: 5 }).validate();
    for (const rating of [0, -1, 6, 4.5]) await assert.rejects(() => review(completed, { rating }).validate());
    const uniqueIndex = Review.schema.indexes().find(([fields, options]) => fields.applicationId === 1 && options.unique);
    assert.ok(uniqueIndex);
});

test("completed archived engagement creates a Review with authoritative identities", async () => {
    const studentDocument = student();
    const providerDocument = provider();
    const completed = application(studentDocument, providerDocument);
    await withCreateMocks(completed, async () => {
        const res = response();
        await createReview({ studentAccount: studentDocument, body: { applicationId: completed._id.toString(), rating: 5, comment: "  Excellent completed work.  " } }, res);
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.review.applicationId, completed._id.toString());
        assert.equal(res.body.review.rating, 5);
        assert.equal(res.body.review.comment, "Excellent completed work.");
    });
});

test("only completed Applications are Review eligible", async () => {
    const studentDocument = student();
    const providerDocument = provider();
    for (const status of ["pending_review", "in_progress", "declined", "withdrawn", "cancelled"]) {
        const candidate = application(studentDocument, providerDocument, { status, completedAt: undefined });
        await withCreateMocks(candidate, async () => {
            const res = response();
            await createReview({ studentAccount: studentDocument, body: { applicationId: candidate._id.toString(), rating: 4 } }, res);
            assert.equal(res.statusCode, 409, status);
            assert.equal(res.body.code, "REVIEW_NOT_ELIGIBLE");
        });
    }
});

test("Student cannot Review another Student's completed Application", async () => {
    const owner = student();
    const other = student({ email: "other@ruh.ac.lk" });
    const completed = application(owner, provider());
    await withCreateMocks(completed, async () => {
        const res = response();
        await createReview({ studentAccount: other, body: { applicationId: completed._id.toString(), rating: 5 } }, res);
        assert.equal(res.statusCode, 403);
    });
});

test("client cannot spoof Review identities or aggregate/system fields", async () => {
    const studentDocument = student();
    const completed = application(studentDocument, provider());
    for (const field of ["studentId", "jobId", "jobProviderId", "averageRating", "createdAt"]) {
        await withCreateMocks(completed, async () => {
            const res = response();
            await createReview({ studentAccount: studentDocument, body: { applicationId: completed._id.toString(), rating: 5, [field]: "spoofed" } }, res);
            assert.equal(res.statusCode, 400, field);
        });
    }
});

test("Review input accepts 1-5 integers and rejects invalid rating values", async () => {
    const studentDocument = student();
    const completed = application(studentDocument, provider());
    for (const rating of [0, 6, -1, 2.5, "invalid", "NaN"]) {
        await withCreateMocks(completed, async () => {
            const res = response();
            await createReview({ studentAccount: studentDocument, body: { applicationId: completed._id.toString(), rating } }, res);
            assert.equal(res.statusCode, 400, String(rating));
        });
    }
});

test("duplicate check and duplicate-key race both return sanitized 409", async () => {
    const studentDocument = student();
    const completed = application(studentDocument, provider());
    await withCreateMocks(completed, async () => {
        const res = response();
        await createReview({ studentAccount: studentDocument, body: { applicationId: completed._id.toString(), rating: 5 } }, res);
        assert.equal(res.statusCode, 409);
        assert.equal(res.body.code, "REVIEW_ALREADY_EXISTS");
    }, { existing: true });
    const duplicate = new Error("duplicate"); duplicate.code = 11000;
    await withCreateMocks(completed, async () => {
        const res = response();
        await createReview({ studentAccount: studentDocument, body: { applicationId: completed._id.toString(), rating: 5 } }, res);
        assert.equal(res.statusCode, 409);
        assert.equal(res.body.code, "REVIEW_ALREADY_EXISTS");
    }, { saveError: duplicate });
});

test("central aggregate recalculation rounds both Job and Provider ratings to one decimal", async () => {
    const jobId = new mongoose.Types.ObjectId();
    const providerId = new mongoose.Types.ObjectId();
    const originals = [Review.aggregate, Job.updateOne, JobProvider.updateOne];
    const updates = [];
    Review.aggregate = async (pipeline) => pipeline[0].$match.jobId
        ? [{ averageRating: 4.666666, reviewCount: 3 }]
        : [{ averageRating: 4.25, reviewCount: 4 }];
    Job.updateOne = async (filter, update) => { updates.push({ kind: "job", filter, update }); };
    JobProvider.updateOne = async (filter, update) => { updates.push({ kind: "provider", filter, update }); };
    try {
        const result = await recalculateReviewAggregates(jobId, providerId);
        assert.deepEqual(result, { jobRating: { averageRating: 4.7, reviewCount: 3 }, providerRating: { averageRating: 4.3, reviewCount: 4 } });
        assert.equal(updates[0].update.$set.averageRating, 4.7);
        assert.equal(updates[1].update.$set.averageRating, 4.3);
    } finally { [Review.aggregate, Job.updateOne, JobProvider.updateOne] = originals; }
});

test("aggregate recalculation restores null and zero when no Reviews remain", async () => {
    const originals = [Review.aggregate, Job.updateOne, JobProvider.updateOne];
    const updates = [];
    Review.aggregate = async () => [];
    Job.updateOne = async (filter, update) => { updates.push(update.$set); };
    JobProvider.updateOne = async (filter, update) => { updates.push(update.$set); };
    try {
        await recalculateReviewAggregates(new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId());
        assert.deepEqual(updates, [{ averageRating: null, reviewCount: 0 }, { averageRating: null, reviewCount: 0 }]);
    } finally { [Review.aggregate, Job.updateOne, JobProvider.updateOne] = originals; }
});

test("Student deletes only their own Review without deleting the completed Application", async () => {
    const studentDocument = student();
    const completed = application(studentDocument, provider());
    const owned = review(completed);
    const originals = [Review.findById, Review.deleteOne, Review.aggregate, Job.updateOne, JobProvider.updateOne, Application.deleteOne];
    let deleted;
    let applicationDeleted = false;
    Review.findById = async () => owned;
    Review.deleteOne = async (filter) => { deleted = filter; };
    Review.aggregate = async () => [];
    Job.updateOne = async () => {};
    JobProvider.updateOne = async () => {};
    Application.deleteOne = async () => { applicationDeleted = true; };
    try {
        const res = response();
        await deleteMyReview({ studentAccount: studentDocument, params: { id: owned._id.toString() } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(deleted._id.toString(), owned._id.toString());
        assert.equal(applicationDeleted, false);
    } finally { [Review.findById, Review.deleteOne, Review.aggregate, Job.updateOne, JobProvider.updateOne, Application.deleteOne] = originals; }
});

test("Student cannot delete another Student's Review while Admin deletion recalculates", async () => {
    const owner = student();
    const other = student({ email: "other@ruh.ac.lk" });
    const stored = review(application(owner, provider()));
    const originals = [Review.findById, Review.deleteOne, Review.aggregate, Job.updateOne, JobProvider.updateOne];
    let deleteCount = 0;
    Review.findById = async () => stored;
    Review.deleteOne = async () => { deleteCount += 1; };
    Review.aggregate = async () => [];
    Job.updateOne = async () => {};
    JobProvider.updateOne = async () => {};
    try {
        const studentResponse = response();
        await deleteMyReview({ studentAccount: other, params: { id: stored._id.toString() } }, studentResponse);
        assert.equal(studentResponse.statusCode, 403);
        assert.equal(deleteCount, 0);
        const adminResponse = response();
        await deleteReviewAsAdmin({ params: { id: stored._id.toString() } }, adminResponse);
        assert.equal(adminResponse.statusCode, 200);
        assert.equal(deleteCount, 1);
    } finally { [Review.findById, Review.deleteOne, Review.aggregate, Job.updateOne, JobProvider.updateOne] = originals; }
});

test("public Job Reviews are paginated and expose only safe Student identity", async () => {
    const studentDocument = student();
    const stored = review(application(studentDocument, provider())).toObject();
    stored.studentId = studentDocument.toObject();
    const originals = [Review.find, Review.countDocuments];
    Review.find = () => queryResult([stored]);
    Review.countDocuments = async () => 11;
    try {
        const res = response();
        await listJobReviews({ params: { jobId: stored.jobId.toString() }, query: { page: "2", limit: "10" } }, res);
        assert.deepEqual(res.body.pagination, { page: 2, limit: 10, total: 11, pages: 2 });
        assert.equal(res.body.reviews[0].student.firstName, "Ruhuna");
        assert.equal(res.body.reviews[0].student.email, undefined);
        assert.equal(res.body.reviews[0].student.phoneNumber, undefined);
    } finally { [Review.find, Review.countDocuments] = originals; }
});

test("Provider Review listing is ownership scoped and Admin listing is bounded", async () => {
    const providerDocument = provider({ averageRating: 4.8, reviewCount: 6 });
    const originals = [Review.find, Review.countDocuments];
    const filters = [];
    Review.find = (filter) => { filters.push(filter); return queryResult([]); };
    Review.countDocuments = async () => 0;
    try {
        const providerResponse = response();
        await listProviderReviews({ jobProviderAccount: providerDocument, query: {} }, providerResponse);
        assert.equal(filters[0].jobProviderId.toString(), providerDocument._id.toString());
        assert.deepEqual(providerResponse.body.summary, { averageRating: 4.8, reviewCount: 6 });
        const adminResponse = response();
        await listAdminReviews({ query: { rating: "5", q: "helpful", limit: "20" } }, adminResponse);
        assert.equal(filters[1].rating, 5);
        assert.ok(filters[1].comment.$regex.includes("helpful"));
    } finally { [Review.find, Review.countDocuments] = originals; }
});

test("Review serializers expose safe context and Review routes retain role protection", () => {
    const studentDocument = student();
    const providerDocument = provider();
    const completed = application(studentDocument, providerDocument);
    const value = review(completed).toObject();
    value.studentId = studentDocument.toObject();
    value.jobId = { _id: completed.jobId, jobTitle: "Research Assistant", archivedAt: new Date() };
    value.jobProviderId = providerDocument.toObject();
    const serialized = serializeReview(value, { includeContext: true });
    assert.equal(serialized.student.email, undefined);
    assert.equal(serialized.job.isArchived, true);
    assert.equal(serialized.provider.companyEmail, undefined);
    assert.ok(routeExists(reviewRouter, "post", "/"));
    assert.ok(routeExists(reviewRouter, "delete", "/:id"));
    assert.ok(routeExists(jobRouter, "get", "/:jobId/reviews"));
    assert.ok(routeExists(jobProviderRouter, "get", "/reviews"));
    assert.ok(routeExists(adminRouter, "get", "/reviews"));
    assert.ok(routeExists(adminRouter, "delete", "/reviews/:id"));
});

test("Provider and Admin roles fail the Student-only Review guard", () => {
    for (const role of ["Job_Provider", "admin"]) {
        const res = response();
        let passed = false;
        isStudent({ user: { role } }, res, () => { passed = true; });
        assert.equal(passed, false);
        assert.equal(res.statusCode, 403);
    }
});
