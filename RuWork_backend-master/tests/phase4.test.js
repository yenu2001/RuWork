import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import {
    buildPublicJobQuery,
    createJob,
    deleteJob,
    getJob,
    getListOptions,
    listJobs,
    serializeJobSummary,
    updateJob
} from "../controllers/jobController.js";
import {
    isJobProvider,
    requireApprovedJobProvider
} from "../middlewears/authMiddleware.js";
import Job from "../models/job.js";
import JobProvider from "../models/jobProvider.js";
import { JOB_PROVIDER_ROLE, STUDENT_ROLE } from "../utils/account.js";

function createResponse() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };
}

function futureDeadline(days = 10) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function validJobData(overrides = {}) {
    return {
        jobTitle: "UI Design Assistant",
        jobDescription: "Support a local design team with interface design tasks.",
        category: "Content Creation",
        requiredSkills: ["Figma", "Communication"],
        scope: "Create and refine a small set of application screens.",
        location: "Matara",
        workingHours: "10 hours per week",
        suitableFor: "Any Year",
        applicationDeadline: futureDeadline(),
        budgetType: "hourly",
        hourlyRate: 1500,
        ...overrides
    };
}

function provider(overrides = {}) {
    return new JobProvider({
        _id: new mongoose.Types.ObjectId(),
        companyName: "ABC Technologies",
        companyEmail: "jobs@abc.example",
        phoneNumber: "0712345678",
        companyAddress: "Matara",
        companySize: "11-50 employees",
        industry: "Technology",
        companyDescription: "A trusted local technology company.",
        firstName: "Test",
        lastName: "Provider",
        password: "hashed-password",
        isEmailVerified: true,
        accountStatus: "approved",
        ...overrides
    });
}

function jobDocument(ownerId, overrides = {}) {
    return new Job({
        _id: new mongoose.Types.ObjectId(),
        jobProviderId: ownerId,
        companyName: "ABC Technologies",
        status: "open",
        ...validJobData(),
        ...overrides
    });
}

test("Job schema supports hourly and fixed pricing while normalizing skills", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const hourly = jobDocument(ownerId, {
        requiredSkills: [" Figma ", "figma", " Communication  Skills "],
        hourlyRate: 1250,
        budget: 9999
    });
    await hourly.validate();
    assert.equal(hourly.priceAmount, 1250);
    assert.equal(hourly.budget, undefined);
    assert.deepEqual(hourly.requiredSkills, ["Figma", "Communication Skills"]);

    const fixed = jobDocument(ownerId, {
        budgetType: "fixed",
        hourlyRate: 100,
        budget: 8000
    });
    await fixed.validate();
    assert.equal(fixed.priceAmount, 8000);
    assert.equal(fixed.hourlyRate, undefined);
});

test("Job schema rejects missing, zero, and negative primary prices", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    await assert.rejects(jobDocument(ownerId, { hourlyRate: 0 }).validate(), /greater than zero/);
    await assert.rejects(jobDocument(ownerId, { hourlyRate: -10 }).validate(), /greater than zero/);
    await assert.rejects(jobDocument(ownerId, { budgetType: "fixed", budget: undefined }).validate(), /budget greater than zero/);
});

test("approved Provider creates a Job with authoritative ownership and company", async () => {
    const account = provider();
    const originalSave = Job.prototype.save;
    let savedJob;
    Job.prototype.save = async function saveWithoutDatabase() {
        await this.validate();
        savedJob = this;
        return this;
    };

    try {
        const res = createResponse();
        await createJob({ body: validJobData(), jobProviderAccount: account }, res);
        assert.equal(res.statusCode, 201);
        assert.equal(savedJob.jobProviderId.toString(), account._id.toString());
        assert.equal(savedJob.companyName, account.companyName);
        assert.equal(savedJob.status, "open");
        assert.equal(res.body.job.id, savedJob._id.toString());
    } finally {
        Job.prototype.save = originalSave;
    }
});

test("client cannot spoof Job ownership, company identity, or rating aggregates", async () => {
    const account = provider();
    for (const field of ["jobProviderId", "companyName", "averageRating", "reviewCount"]) {
        const res = createResponse();
        await createJob({
            body: { ...validJobData(), [field]: field === "reviewCount" ? 99 : "spoofed" },
            jobProviderAccount: account
        }, res);
        assert.equal(res.statusCode, 400, `${field} should be rejected`);
    }
});

test("pending Provider and Student cannot reach Job creation", async () => {
    const originalFindById = JobProvider.findById;
    JobProvider.findById = async () => provider({ accountStatus: "pending" });
    try {
        const pendingResponse = createResponse();
        let pendingPassed = false;
        await requireApprovedJobProvider(
            { user: { sub: new mongoose.Types.ObjectId().toString() } },
            pendingResponse,
            () => { pendingPassed = true; }
        );
        assert.equal(pendingPassed, false);
        assert.equal(pendingResponse.statusCode, 403);

        const studentResponse = createResponse();
        let studentPassed = false;
        isJobProvider({ user: { role: STUDENT_ROLE } }, studentResponse, () => { studentPassed = true; });
        assert.equal(studentPassed, false);
        assert.equal(studentResponse.statusCode, 403);
    } finally {
        JobProvider.findById = originalFindById;
    }
});

test("Provider cannot edit or delete another Provider's Job", async () => {
    const account = provider();
    const otherJob = jobDocument(new mongoose.Types.ObjectId());
    const originalFindById = Job.findById;
    Job.findById = async () => otherJob;
    try {
        const updateResponse = createResponse();
        await updateJob({ params: { id: otherJob._id.toString() }, body: { jobTitle: "Changed" }, jobProviderAccount: account }, updateResponse);
        assert.equal(updateResponse.statusCode, 403);

        const deleteResponse = createResponse();
        await deleteJob({ params: { id: otherJob._id.toString() }, jobProviderAccount: account }, deleteResponse);
        assert.equal(deleteResponse.statusCode, 403);
    } finally {
        Job.findById = originalFindById;
    }
});

test("owning Provider can update pricing, close, reopen, and archive a Job", async () => {
    const account = provider();
    const ownedJob = jobDocument(account._id);
    const originalFindById = Job.findById;
    let deleted = false;
    ownedJob.save = async function saveWithoutDatabase() {
        await this.validate();
        return this;
    };
    ownedJob.deleteOne = async () => { deleted = true; };
    Job.findById = async () => ownedJob;
    try {
        const pricingResponse = createResponse();
        await updateJob({
            params: { id: ownedJob._id.toString() },
            body: { budgetType: "fixed", budget: 12000 },
            jobProviderAccount: account
        }, pricingResponse);
        assert.equal(pricingResponse.statusCode, 200);
        assert.equal(ownedJob.budget, 12000);
        assert.equal(ownedJob.hourlyRate, undefined);

        const closeResponse = createResponse();
        await updateJob({ params: { id: ownedJob._id.toString() }, body: { status: "closed" }, jobProviderAccount: account }, closeResponse);
        assert.equal(ownedJob.status, "closed");

        const reopenResponse = createResponse();
        await updateJob({ params: { id: ownedJob._id.toString() }, body: { status: "open" }, jobProviderAccount: account }, reopenResponse);
        assert.equal(ownedJob.status, "open");

        const deleteResponse = createResponse();
        await deleteJob({ params: { id: ownedJob._id.toString() }, jobProviderAccount: account }, deleteResponse);
        assert.equal(deleteResponse.statusCode, 200);
        assert.equal(deleted, false);
        assert.equal(ownedJob.status, "closed");
        assert.ok(ownedJob.archivedAt instanceof Date);
    } finally {
        Job.findById = originalFindById;
    }
});

test("public browse query safely supports search, filters, pricing, and availability", () => {
    const now = new Date("2026-08-28T00:00:00.000Z");
    const filter = buildPublicJobQuery({
        q: "  tutor   science ",
        category: "Tutoring",
        location: "Matara.*",
        skill: "Teaching+",
        suitableFor: "2nd Year",
        budgetType: "hourly",
        minPrice: "500",
        maxPrice: "2000"
    }, now);
    assert.deepEqual(filter.$text, { $search: "tutor science" });
    assert.equal(filter.status, "open");
    assert.deepEqual(filter.applicationDeadline, { $gt: now });
    assert.equal(filter.location.$regex, "Matara\\.\\*");
    assert.equal(filter.requiredSkills.$regex, "^Teaching\\+$");
    assert.deepEqual(filter.priceAmount, { $gte: 500, $lte: 2000 });
});

test("pagination is bounded and sort fields are whitelisted", () => {
    assert.deepEqual(getListOptions({ page: "2", limit: "12", sort: "price-high" }), {
        page: 2,
        limit: 12,
        sortName: "price-high",
        sort: { priceAmount: -1, createdAt: -1 }
    });
    assert.throws(() => getListOptions({ limit: "500" }), /between 1 and 50/);
    assert.throws(() => getListOptions({ sort: "$where" }), /Invalid Job sort option/);
    assert.throws(() => buildPublicJobQuery({ minPrice: "200", maxPrice: "100" }), /cannot exceed/);
});

test("Job listing returns pagination metadata and lightweight rating summaries", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const listedJob = jobDocument(ownerId, { averageRating: null, reviewCount: 0 }).toObject();
    const originalFind = Job.find;
    const originalCount = Job.countDocuments;
    let capturedFilter;
    Job.find = (filter) => {
        capturedFilter = filter;
        return {
            select() { return this; }, sort() { return this; }, skip() { return this; },
            limit() { return this; }, populate() { return this; }, lean() { return this; },
            async exec() { return [listedJob]; }
        };
    };
    Job.countDocuments = async () => 13;
    try {
        const res = createResponse();
        await listJobs({ query: { page: "2", limit: "12" } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(capturedFilter.status, "open");
        assert.equal(res.body.jobs[0].averageRating, null);
        assert.equal(res.body.jobs[0].reviewCount, 0);
        assert.deepEqual(res.body.pagination, { page: 2, limit: 12, total: 13, pages: 2 });
        assert.equal("jobDescription" in res.body.jobs[0], false);
    } finally {
        Job.find = originalFind;
        Job.countDocuments = originalCount;
    }
});

test("Job Details response exposes public company fields but no Provider secrets", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const publicJob = {
        ...jobDocument(ownerId).toObject(),
        jobProviderId: {
            _id: ownerId,
            companyName: "Current ABC Technologies",
            industry: "Technology",
            companyWebsite: "https://abc.example",
            password: "must-not-leak",
            companyEmail: "private@abc.example"
        }
    };
    const originalFindOne = Job.findOne;
    Job.findOne = () => ({
        populate() { return this; }, lean() { return this; }, async exec() { return publicJob; }
    });
    try {
        const res = createResponse();
        await getJob({ params: { id: publicJob._id.toString() } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.job.companyName, "Current ABC Technologies");
        assert.equal(res.body.job.provider.industry, "Technology");
        assert.equal("password" in res.body.job.provider, false);
        assert.equal("companyEmail" in res.body.job.provider, false);
        assert.equal("jobProviderId" in res.body.job, false);
    } finally {
        Job.findOne = originalFindOne;
    }
});

test("rating summary reports null rather than a misleading zero rating", () => {
    const summary = serializeJobSummary(jobDocument(new mongoose.Types.ObjectId(), {
        averageRating: null,
        reviewCount: 0
    }));
    assert.equal(summary.averageRating, null);
    assert.equal(summary.reviewCount, 0);
    assert.equal(summary.status, "open");
});

test("Provider role constant remains compatible with protected Job routes", () => {
    assert.equal(provider().role, JOB_PROVIDER_ROLE);
});
