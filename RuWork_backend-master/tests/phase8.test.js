import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import Application from "../models/application.js";
import Job from "../models/job.js";
import JobProvider from "../models/jobProvider.js";
import Message from "../models/message.js";
import Notification from "../models/notification.js";
import User from "../models/user.js";
import { getConversation, getUnreadMessageCount, listConversations, sendMessage } from "../controllers/messageController.js";
import { getUnreadNotificationCount, listNotifications, markAllNotificationsRead, markNotificationRead } from "../controllers/notificationController.js";
import { acceptApplication, applyToJob, cancelMyApplication, completeApplication, declineApplication, withdrawMyApplication } from "../controllers/applicationController.js";
import messageRouter from "../routes/messageRouter.js";
import notificationRouter from "../routes/notificationRouter.js";
import { UNIVERSITY_NAME } from "../utils/account.js";
import { identifier } from "../utils/communication.js";

function response() {
    return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

function queryResult(result) {
    return { select() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, populate() { return this; }, lean() { return this; }, async exec() { return result; } };
}

function student(overrides = {}) {
    return new User({ _id: new mongoose.Types.ObjectId(), firstName: "Ruhuna", lastName: "Student", email: "student@ruh.ac.lk", phoneNumber: "0712345678", dateOfBirth: "2002-01-01", gender: "Prefer not to say", password: "hashed", university: UNIVERSITY_NAME, faculty: "Science", fieldOfStudy: "Computer Science", yearOfStudy: "2nd Year", isEmailVerified: true, accountStatus: "approved", ...overrides });
}

function provider(overrides = {}) {
    return new JobProvider({ _id: new mongoose.Types.ObjectId(), companyName: "Current Company", companyEmail: "jobs@example.com", phoneNumber: "0771234567", companyAddress: "Matara", companySize: "11-50", industry: "Technology", companyDescription: "Trusted company", firstName: "Jane", lastName: "Owner", password: "hashed", isEmailVerified: true, accountStatus: "approved", ...overrides });
}

function job(providerDocument, overrides = {}) {
    return new Job({ _id: new mongoose.Types.ObjectId(), jobProviderId: providerDocument._id, companyName: providerDocument.companyName, jobTitle: "Data Entry Assistant", jobDescription: "Support a verified data entry project.", category: "Data Entry", requiredSkills: ["Excel"], scope: "Complete one workbook.", location: "Remote", workingHours: "Flexible", suitableFor: "Any Year", applicationDeadline: new Date(Date.now() + 86400000), budgetType: "fixed", budget: 8000, status: "open", ...overrides });
}

function application(studentDocument, providerDocument, jobDocument, overrides = {}) {
    const status = overrides.status || "pending_review";
    return new Application({ _id: new mongoose.Types.ObjectId(), jobId: jobDocument._id, studentId: studentDocument._id, jobProviderId: providerDocument._id, applicationNote: "I have relevant experience and can complete this work carefully.", status, budgetType: "fixed", originalBudget: 8000, approvedBudget: ["in_progress", "completed", "cancelled"].includes(status) ? 8500 : undefined, ...overrides });
}

function participant(type, account) {
    return { type, id: account._id, account };
}

function routeExists(router, method, path) {
    return router.stack.some((layer) => layer.route?.path === path && layer.route.methods?.[method]);
}

async function withMessageContext(applicationDocument, studentDocument, providerDocument, jobDocument, run) {
    const originals = [Application.findById, Job.findById, User.findById, JobProvider.findById, Message.prototype.save, Notification.create];
    Application.findById = () => queryResult(applicationDocument.toObject());
    Job.findById = () => queryResult(jobDocument.toObject());
    User.findById = () => queryResult(studentDocument.toObject());
    JobProvider.findById = () => queryResult(providerDocument.toObject());
    Message.prototype.save = async function saveWithoutDatabase() { await this.validate(); return this; };
    const notifications = [];
    Notification.create = async (value) => { notifications.push(value); return value; };
    try { return await run(notifications); } finally { [Application.findById, Job.findById, User.findById, JobProvider.findById, Message.prototype.save, Notification.create] = originals; }
}

test("Message and Notification schemas enforce bounded safe participant types", async () => {
    const studentDocument = student();
    const providerDocument = provider();
    const jobDocument = job(providerDocument);
    const applicationDocument = application(studentDocument, providerDocument, jobDocument);
    const valid = new Message({ senderType: "student", senderId: studentDocument._id, receiverType: "jobProvider", receiverId: providerDocument._id, jobId: jobDocument._id, applicationId: applicationDocument._id, content: "Hello" });
    await valid.validate();
    await assert.rejects(() => new Message({ ...valid.toObject(), senderType: "Admin" }).validate());
    await assert.rejects(() => new Message({ ...valid.toObject(), content: "   " }).validate());
    await assert.rejects(() => new Notification({ recipientType: "Admin", recipientId: providerDocument._id, type: "NEW_MESSAGE", message: "New message" }).validate());
    assert.ok(Message.schema.indexes().some(([fields]) => fields.applicationId === 1 && fields.createdAt === -1));
});

test("Student sends to the authoritative related Provider and may share only their own contact", async () => {
    const studentDocument = student(); const providerDocument = provider(); const jobDocument = job(providerDocument); const applicationDocument = application(studentDocument, providerDocument, jobDocument);
    await withMessageContext(applicationDocument, studentDocument, providerDocument, jobDocument, async (notifications) => {
        const res = response();
        await sendMessage({ communicationParticipant: participant("student", studentDocument), body: { applicationId: applicationDocument._id.toString(), content: "  Can we confirm the schedule?  ", includeContactNumber: true } }, res);
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.item.content, "Can we confirm the schedule?");
        assert.equal(res.body.item.sharedContactNumber, studentDocument.phoneNumber);
        assert.equal(res.body.item.sender.displayName, "Ruhuna Student");
        assert.equal(notifications[0].recipientId.toString(), providerDocument._id.toString());
        assert.equal(notifications[0].type, "NEW_MESSAGE");
    });
});

test("Student cannot message an unrelated Provider or spoof Message identities", async () => {
    const owner = student(); const other = student({ email: "other@ruh.ac.lk" }); const providerDocument = provider(); const jobDocument = job(providerDocument); const applicationDocument = application(owner, providerDocument, jobDocument);
    await withMessageContext(applicationDocument, owner, providerDocument, jobDocument, async () => {
        const forbidden = response();
        await sendMessage({ communicationParticipant: participant("student", other), body: { applicationId: applicationDocument._id.toString(), content: "Hello" } }, forbidden);
        assert.equal(forbidden.statusCode, 403);
        for (const field of ["senderId", "senderType", "receiverId", "receiverType"]) {
            const spoofed = response();
            await sendMessage({ communicationParticipant: participant("student", owner), body: { applicationId: applicationDocument._id.toString(), content: "Hello", [field]: "spoofed" } }, spoofed);
            assert.equal(spoofed.statusCode, 400);
        }
    });
});

test("Provider may message only a Student attached to the Provider's own Application", async () => {
    const studentDocument = student(); const providerDocument = provider(); const otherProvider = provider({ companyEmail: "other@example.com" }); const jobDocument = job(providerDocument); const applicationDocument = application(studentDocument, providerDocument, jobDocument);
    await withMessageContext(applicationDocument, studentDocument, providerDocument, jobDocument, async (notifications) => {
        const allowed = response();
        await sendMessage({ communicationParticipant: participant("jobProvider", providerDocument), body: { applicationId: applicationDocument._id.toString(), content: "Your Application is being reviewed." } }, allowed);
        assert.equal(allowed.statusCode, 201);
        assert.equal(allowed.body.item.sharedContactNumber, null);
        assert.equal(notifications[0].recipientId.toString(), studentDocument._id.toString());
        const forbidden = response();
        await sendMessage({ communicationParticipant: participant("jobProvider", otherProvider), body: { applicationId: applicationDocument._id.toString(), content: "Hello" } }, forbidden);
        assert.equal(forbidden.statusCode, 403);
    });
});

test("conversation history is participant-only and marks only received Messages read", async () => {
    const studentDocument = student(); const providerDocument = provider(); const jobDocument = job(providerDocument); const applicationDocument = application(studentDocument, providerDocument, jobDocument);
    await withMessageContext(applicationDocument, studentDocument, providerDocument, jobDocument, async () => {
        const stored = new Message({ _id: new mongoose.Types.ObjectId(), senderType: "jobProvider", senderId: providerDocument._id, receiverType: "student", receiverId: studentDocument._id, jobId: jobDocument._id, applicationId: applicationDocument._id, content: "Welcome", createdAt: new Date(), isRead: false }).toObject();
        const originals = [Message.updateMany, Message.find, Message.countDocuments];
        let readFilter;
        Message.updateMany = async (filter) => { readFilter = filter; return { modifiedCount: 1 }; };
        Message.find = () => queryResult([stored]);
        Message.countDocuments = async () => 1;
        try {
            const own = response();
            await getConversation({ communicationParticipant: participant("student", studentDocument), params: { applicationId: applicationDocument._id.toString() }, query: {} }, own);
            assert.equal(own.statusCode, 200);
            assert.equal(own.body.unreadMarked, 1);
            assert.equal(readFilter.receiverId.toString(), studentDocument._id.toString());
            assert.equal(own.body.messages[0].sender.displayName, providerDocument.companyName);
            const stranger = student({ email: "stranger@ruh.ac.lk" });
            const denied = response();
            await getConversation({ communicationParticipant: participant("student", stranger), params: { applicationId: applicationDocument._id.toString() }, query: {} }, denied);
            assert.equal(denied.statusCode, 403);
        } finally { [Message.updateMany, Message.find, Message.countDocuments] = originals; }
    });
});

test("conversation summaries are bounded, scoped, safe, and include unread count", async () => {
    const studentDocument = student(); const providerDocument = provider(); const jobDocument = job(providerDocument); const applicationDocument = application(studentDocument, providerDocument, jobDocument);
    const latest = new Message({ _id: new mongoose.Types.ObjectId(), senderType: "jobProvider", senderId: providerDocument._id, receiverType: "student", receiverId: studentDocument._id, jobId: jobDocument._id, applicationId: applicationDocument._id, content: "Latest update", createdAt: new Date() }).toObject();
    const originals = [Message.aggregate, Message.distinct, Application.find, Job.find, User.find, JobProvider.find];
    Message.aggregate = async () => [{ _id: applicationDocument._id, latestMessage: latest, unreadCount: 2 }];
    Message.distinct = async () => [applicationDocument._id];
    Application.find = () => queryResult([applicationDocument.toObject()]);
    Job.find = () => queryResult([jobDocument.toObject()]);
    User.find = () => queryResult([studentDocument.toObject()]);
    JobProvider.find = () => queryResult([providerDocument.toObject()]);
    try {
        const res = response();
        await listConversations({ communicationParticipant: participant("student", studentDocument), query: { limit: "20" } }, res);
        assert.equal(res.body.conversations[0].unreadCount, 2);
        assert.equal(res.body.conversations[0].otherParticipant.displayName, providerDocument.companyName);
        assert.equal(res.body.conversations[0].otherParticipant.companyEmail, undefined);
        assert.equal(res.body.pagination.total, 1);
    } finally { [Message.aggregate, Message.distinct, Application.find, Job.find, User.find, JobProvider.find] = originals; }
});

test("Message unread count is scoped to the authoritative participant", async () => {
    const account = student(); const original = Message.countDocuments; let filter;
    Message.countDocuments = async (value) => { filter = value; return 4; };
    try { const res = response(); await getUnreadMessageCount({ communicationParticipant: participant("student", account) }, res); assert.equal(res.body.unreadCount, 4); assert.equal(filter.receiverId.toString(), account._id.toString()); assert.equal(filter.isRead, false); }
    finally { Message.countDocuments = original; }
});

test("Notification listing is recipient-scoped, paginated, and supports unread-only", async () => {
    const account = student(); const originalFind = Notification.find; const originalCount = Notification.countDocuments; let filter;
    const stored = new Notification({ _id: new mongoose.Types.ObjectId(), recipientType: "student", recipientId: account._id, type: "APPLICATION_ACCEPTED", message: "Accepted", createdAt: new Date() }).toObject();
    Notification.find = (value) => { filter = value; return queryResult([stored]); };
    Notification.countDocuments = async () => 1;
    try { const res = response(); await listNotifications({ communicationParticipant: participant("student", account), query: { unreadOnly: "true", page: "1", limit: "20" } }, res); assert.equal(filter.recipientType, "student"); assert.equal(filter.isRead, false); assert.equal(res.body.notifications[0].type, "APPLICATION_ACCEPTED"); assert.equal(res.body.notifications[0].recipientId, undefined); }
    finally { Notification.find = originalFind; Notification.countDocuments = originalCount; }
});

test("only a Notification recipient may mark it read", async () => {
    const account = student(); const other = student({ email: "other@ruh.ac.lk" }); const stored = new Notification({ _id: new mongoose.Types.ObjectId(), recipientType: "student", recipientId: account._id, type: "APPLICATION_ACCEPTED", message: "Accepted" }); stored.save = async () => stored;
    const original = Notification.findOne; const filters = [];
    Notification.findOne = async (filter) => { filters.push(filter); return identifier(filter.recipientId) === identifier(account._id) ? stored : null; };
    try { const own = response(); await markNotificationRead({ communicationParticipant: participant("student", account), params: { id: stored._id.toString() } }, own); assert.equal(own.body.notification.isRead, true); const denied = response(); await markNotificationRead({ communicationParticipant: participant("student", other), params: { id: stored._id.toString() } }, denied); assert.equal(denied.statusCode, 404); }
    finally { Notification.findOne = original; }
});

test("Notification unread count and mark-all operate only on the current recipient", async () => {
    const account = provider(); const originals = [Notification.countDocuments, Notification.updateMany]; let countFilter; let updateFilter;
    Notification.countDocuments = async (filter) => { countFilter = filter; return 3; };
    Notification.updateMany = async (filter) => { updateFilter = filter; return { modifiedCount: 3 }; };
    try { const count = response(); await getUnreadNotificationCount({ communicationParticipant: participant("jobProvider", account) }, count); assert.equal(count.body.unreadCount, 3); assert.equal(countFilter.recipientType, "jobProvider"); const all = response(); await markAllNotificationsRead({ communicationParticipant: participant("jobProvider", account) }, all); assert.equal(all.body.updatedCount, 3); assert.equal(updateFilter.recipientId.toString(), account._id.toString()); }
    finally { [Notification.countDocuments, Notification.updateMany] = originals; }
});

test("all six Application lifecycle actions create authoritative Notifications", async () => {
    const studentDocument = student(); const providerDocument = provider(); const jobDocument = job(providerDocument); const originals = [Notification.create, Job.findOne, Application.findOne, Application.findById, Job.findById, Application.prototype.save];
    const created = [];
    Notification.create = async (value) => { created.push(value); return value; };
    Job.findOne = async () => jobDocument;
    Application.prototype.save = async function saveWithoutDatabase() { await this.validate(); return this; };
    Application.findOne = () => queryResult(null);
    try {
        const applyResponse = response();
        await applyToJob({ params: { jobId: jobDocument._id.toString() }, body: { applicationNote: "I can complete this work carefully and on schedule." }, studentAccount: studentDocument }, applyResponse);
        const runStudent = async (status, action) => { const value = application(studentDocument, providerDocument, jobDocument, { status }); value.save = async () => value; Application.findOne = async () => value; await action({ params: { id: value._id.toString() }, body: {}, studentAccount: studentDocument }, response()); };
        await runStudent("pending_review", withdrawMyApplication);
        await runStudent("in_progress", cancelMyApplication);
        const runProvider = async (status, action, body = {}) => { const value = application(studentDocument, providerDocument, jobDocument, { status }); value.save = async () => value; Application.findById = () => ({ populate: async () => value }); Job.findById = async () => jobDocument; await action({ params: { id: value._id.toString() }, body, jobProviderAccount: providerDocument }, response()); };
        await runProvider("pending_review", acceptApplication, { approvedBudget: 8500 });
        await runProvider("pending_review", declineApplication);
        await runProvider("in_progress", completeApplication);
        assert.deepEqual(created.map((item) => item.type), ["NEW_APPLICATION", "APPLICATION_WITHDRAWN", "APPLICATION_CANCELLED", "APPLICATION_ACCEPTED", "APPLICATION_DECLINED", "APPLICATION_COMPLETED"]);
        assert.equal(created[0].recipientId.toString(), providerDocument._id.toString());
        assert.equal(created.at(-1).recipientId.toString(), studentDocument._id.toString());
    } finally { [Notification.create, Job.findOne, Application.findOne, Application.findById, Job.findById, Application.prototype.save] = originals; }
});

test("Message and Notification routes expose bounded authenticated operations", () => {
    assert.ok(routeExists(messageRouter, "post", "/"));
    assert.ok(routeExists(messageRouter, "get", "/conversations"));
    assert.ok(routeExists(messageRouter, "get", "/conversations/:applicationId"));
    assert.ok(routeExists(messageRouter, "get", "/unread-count"));
    assert.ok(routeExists(notificationRouter, "get", "/"));
    assert.ok(routeExists(notificationRouter, "patch", "/read-all"));
    assert.ok(routeExists(notificationRouter, "patch", "/:id/read"));
});
