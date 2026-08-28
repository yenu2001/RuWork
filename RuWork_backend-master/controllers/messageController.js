import mongoose from "mongoose";
import Application from "../models/application.js";
import Job from "../models/job.js";
import JobProvider from "../models/jobProvider.js";
import Message from "../models/message.js";
import User from "../models/user.js";
import {
    CommunicationInputError,
    communicationPagination,
    createNotificationSafely,
    identifier,
    messageContent
} from "../utils/communication.js";

const MESSAGE_SYSTEM_FIELDS = [
    "senderType", "senderId", "receiverType", "receiverId", "jobId", "isRead", "readAt",
    "sharedContactNumber", "createdAt", "updatedAt"
];

function getObject(document) {
    return typeof document?.toObject === "function" ? document.toObject({ getters: false, virtuals: false }) : document;
}

function participantFilter(participant) {
    return {
        $or: [
            { senderType: participant.type, senderId: participant.id },
            { receiverType: participant.type, receiverId: participant.id }
        ]
    };
}

function participantOwnsApplication(application, participant) {
    return participant.type === "student"
        ? identifier(application.studentId) === identifier(participant.id)
        : identifier(application.jobProviderId) === identifier(participant.id);
}

function assertNoMessageSystemFields(body = {}) {
    const field = MESSAGE_SYSTEM_FIELDS.find((name) => Object.hasOwn(body, name));
    if (field) throw new CommunicationInputError(`${field} cannot be set by the client`);
}

function safeMessageError(res, error, fallback) {
    if (error instanceof CommunicationInputError || error?.name === "CastError") return res.status(400).json({ error: error.message });
    if (error?.name === "ValidationError") return res.status(400).json({ error: Object.values(error.errors || {})[0]?.message || "Message information is invalid" });
    return res.status(500).json({ error: fallback });
}

function studentSummary(student) {
    const value = getObject(student);
    return value ? { id: identifier(value._id || value.id), type: "student", displayName: `${value.firstName} ${value.lastName}`.trim() } : undefined;
}

function providerSummary(provider) {
    const value = getObject(provider);
    return value ? { id: identifier(value._id || value.id), type: "jobProvider", displayName: value.companyName } : undefined;
}

function serializeMessage(document, participants = {}) {
    const message = getObject(document);
    const senderKey = `${message.senderType}:${identifier(message.senderId)}`;
    return {
        id: identifier(message._id || message.id),
        applicationId: identifier(message.applicationId),
        jobId: identifier(message.jobId),
        content: message.content,
        sharedContactNumber: message.sharedContactNumber || null,
        sender: participants[senderKey] || { id: identifier(message.senderId), type: message.senderType, displayName: message.senderType === "student" ? "Student" : "Job Provider" },
        isOwn: Boolean(participants.current && senderKey === participants.current),
        isRead: Boolean(message.isRead),
        readAt: message.readAt || null,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
    };
}

async function loadContext(application, jobOverride) {
    const job = jobOverride || await Job.findById(application.jobId).select("jobTitle companyName archivedAt").lean().exec();
    if (!job) return null;
    const [student, provider] = await Promise.all([
        User.findById(application.studentId).select("firstName lastName").lean().exec(),
        JobProvider.findById(application.jobProviderId).select("companyName").lean().exec()
    ]);
    if (!student || !provider) return null;
    return buildContext(application, job, student, provider);
}

function buildContext(application, job, student, provider) {
    return {
        applicationId: identifier(application._id || application.id),
        status: application.status,
        job: { id: identifier(job._id || job.id), jobTitle: job.jobTitle, companyName: provider.companyName || job.companyName, isArchived: Boolean(job.archivedAt) },
        student: studentSummary(student),
        provider: providerSummary(provider)
    };
}

async function authorizedContext(applicationId, participant) {
    if (!mongoose.isValidObjectId(applicationId)) return { status: 404 };
    const application = await Application.findById(applicationId).lean().exec();
    if (!application) return { status: 404 };
    if (!participantOwnsApplication(application, participant)) return { status: 403 };
    const context = await loadContext(application);
    return context ? { application, context } : { status: 404 };
}

function participantMap(context, participant) {
    return {
        [`student:${context.student.id}`]: context.student,
        [`jobProvider:${context.provider.id}`]: context.provider,
        current: `${participant.type}:${identifier(participant.id)}`
    };
}

export async function sendMessage(req, res) {
    try {
        assertNoMessageSystemFields(req.body);
        const participant = req.communicationParticipant;
        const authorized = await authorizedContext(req.body?.applicationId, participant);
        if (authorized.status === 404) return res.status(404).json({ error: "Application conversation not found" });
        if (authorized.status === 403) return res.status(403).json({ error: "You may message only within your own Application relationship" });
        if (req.body?.includeContactNumber !== undefined && typeof req.body.includeContactNumber !== "boolean") {
            throw new CommunicationInputError("includeContactNumber must be true or false");
        }
        if (participant.type !== "student" && req.body?.includeContactNumber) {
            throw new CommunicationInputError("Only a Student may share their own contact number");
        }

        const { application, context } = authorized;
        const senderType = participant.type;
        const receiverType = senderType === "student" ? "jobProvider" : "student";
        const receiverId = senderType === "student" ? application.jobProviderId : application.studentId;
        const message = new Message({
            senderType,
            senderId: participant.id,
            receiverType,
            receiverId,
            jobId: application.jobId,
            applicationId: application._id,
            content: messageContent(req.body?.content),
            sharedContactNumber: senderType === "student" && req.body?.includeContactNumber ? participant.account.phoneNumber : null
        });
        await message.save();

        const senderName = senderType === "student" ? context.student.displayName : context.provider.displayName;
        await createNotificationSafely({
            recipientType: receiverType,
            recipientId: receiverId,
            type: "NEW_MESSAGE",
            message: `You have a new message from ${senderName} about ${context.job.jobTitle}.`,
            relatedJobId: application.jobId,
            relatedApplicationId: application._id,
            relatedMessageId: message._id
        });

        return res.status(201).json({
            message: "Message sent successfully",
            item: serializeMessage(message, participantMap(context, participant)),
            conversation: context
        });
    } catch (error) {
        return safeMessageError(res, error, "Message could not be sent");
    }
}

export async function listConversations(req, res) {
    try {
        const participant = req.communicationParticipant;
        const { page, limit } = communicationPagination(req.query, 20);
        const match = participantFilter(participant);
        const groups = await Message.aggregate([
            { $match: match },
            { $sort: { createdAt: -1 } },
            { $group: {
                _id: "$applicationId",
                latestMessage: { $first: "$$ROOT" },
                unreadCount: { $sum: { $cond: [{ $and: [
                    { $eq: ["$receiverType", participant.type] },
                    { $eq: ["$receiverId", participant.id] },
                    { $eq: ["$isRead", false] }
                ] }, 1, 0] } }
            } },
            { $sort: { "latestMessage.createdAt": -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ]);
        const allIds = await Message.distinct("applicationId", match);
        const applicationIds = groups.map((group) => group._id);
        const applications = applicationIds.length
            ? await Application.find({ _id: { $in: applicationIds } }).lean().exec()
            : [];
        const [jobs, students, providers] = applications.length ? await Promise.all([
            Job.find({ _id: { $in: applications.map((application) => application.jobId) } }).select("jobTitle companyName archivedAt").lean().exec(),
            User.find({ _id: { $in: applications.map((application) => application.studentId) } }).select("firstName lastName").lean().exec(),
            JobProvider.find({ _id: { $in: applications.map((application) => application.jobProviderId) } }).select("companyName").lean().exec()
        ]) : [[], [], []];
        const applicationMap = Object.fromEntries(applications.map((application) => [identifier(application._id), application]));
        const jobMap = Object.fromEntries(jobs.map((job) => [identifier(job._id), job]));
        const studentMap = Object.fromEntries(students.map((student) => [identifier(student._id), student]));
        const providerMap = Object.fromEntries(providers.map((provider) => [identifier(provider._id), provider]));
        const contexts = groups.map((group) => {
            const application = applicationMap[identifier(group._id)];
            if (!application || !participantOwnsApplication(application, participant)) return null;
            const job = jobMap[identifier(application.jobId)];
            const student = studentMap[identifier(application.studentId)];
            const provider = providerMap[identifier(application.jobProviderId)];
            if (!job || !student || !provider) return null;
            const context = buildContext(application, job, student, provider);
            if (!context) return null;
            const latestMessage = serializeMessage(group.latestMessage, participantMap(context, participant));
            const otherParticipant = participant.type === "student" ? context.provider : context.student;
            return { ...context, otherParticipant, latestMessage, unreadCount: group.unreadCount || 0 };
        });
        return res.json({
            conversations: contexts.filter(Boolean),
            pagination: { page, limit, total: allIds.length, pages: allIds.length ? Math.ceil(allIds.length / limit) : 0 }
        });
    } catch (error) {
        return safeMessageError(res, error, "Conversations could not be loaded");
    }
}

export async function getConversation(req, res) {
    try {
        const participant = req.communicationParticipant;
        const authorized = await authorizedContext(req.params.applicationId, participant);
        if (authorized.status === 404) return res.status(404).json({ error: "Application conversation not found" });
        if (authorized.status === 403) return res.status(403).json({ error: "You are not a participant in this conversation" });
        const { page, limit } = communicationPagination(req.query, 30);
        const filter = { applicationId: authorized.application._id, ...participantFilter(participant) };
        const readResult = await Message.updateMany({
            applicationId: authorized.application._id,
            receiverType: participant.type,
            receiverId: participant.id,
            isRead: false
        }, { $set: { isRead: true, readAt: new Date() } });
        const [messages, total] = await Promise.all([
            Message.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
            Message.countDocuments(filter)
        ]);
        const serialized = messages.reverse().map((message) => serializeMessage(message, participantMap(authorized.context, participant)));
        return res.json({
            conversation: authorized.context,
            messages: serialized,
            unreadMarked: readResult.modifiedCount || 0,
            pagination: { page, limit, total, pages: total ? Math.ceil(total / limit) : 0 }
        });
    } catch (error) {
        return safeMessageError(res, error, "Conversation history could not be loaded");
    }
}

export async function getUnreadMessageCount(req, res) {
    try {
        const participant = req.communicationParticipant;
        const unreadCount = await Message.countDocuments({ receiverType: participant.type, receiverId: participant.id, isRead: false });
        return res.json({ unreadCount });
    } catch (error) {
        return res.status(500).json({ error: "Unread Message count could not be loaded" });
    }
}
