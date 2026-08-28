import mongoose from "mongoose";
import Notification from "../models/notification.js";
import { CommunicationInputError, booleanQuery, communicationPagination, identifier } from "../utils/communication.js";

function notificationFilter(participant) {
    return { recipientType: participant.type, recipientId: participant.id };
}

function serializeNotification(document) {
    const notification = typeof document?.toObject === "function" ? document.toObject() : document;
    return {
        id: identifier(notification._id || notification.id),
        type: notification.type,
        message: notification.message,
        relatedJobId: notification.relatedJobId ? identifier(notification.relatedJobId) : null,
        relatedApplicationId: notification.relatedApplicationId ? identifier(notification.relatedApplicationId) : null,
        relatedMessageId: notification.relatedMessageId ? identifier(notification.relatedMessageId) : null,
        isRead: Boolean(notification.isRead),
        readAt: notification.readAt || null,
        createdAt: notification.createdAt
    };
}

function safeNotificationError(res, error, fallback) {
    if (error instanceof CommunicationInputError) return res.status(400).json({ error: error.message });
    return res.status(500).json({ error: fallback });
}

export async function listNotifications(req, res) {
    try {
        const { page, limit } = communicationPagination(req.query, 20);
        const unreadOnly = booleanQuery(req.query?.unreadOnly, "unreadOnly");
        const filter = { ...notificationFilter(req.communicationParticipant), ...(unreadOnly ? { isRead: false } : {}) };
        const [notifications, total] = await Promise.all([
            Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
            Notification.countDocuments(filter)
        ]);
        return res.json({ notifications: notifications.map(serializeNotification), pagination: { page, limit, total, pages: total ? Math.ceil(total / limit) : 0 } });
    } catch (error) {
        return safeNotificationError(res, error, "Notifications could not be loaded");
    }
}

export async function markNotificationRead(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Notification not found" });
        const notification = await Notification.findOne({ _id: req.params.id, ...notificationFilter(req.communicationParticipant) });
        if (!notification) return res.status(404).json({ error: "Notification not found" });
        if (!notification.isRead) {
            notification.isRead = true;
            notification.readAt = new Date();
            await notification.save();
        }
        return res.json({ notification: serializeNotification(notification) });
    } catch (error) {
        return safeNotificationError(res, error, "Notification could not be marked read");
    }
}

export async function markAllNotificationsRead(req, res) {
    try {
        const result = await Notification.updateMany({ ...notificationFilter(req.communicationParticipant), isRead: false }, { $set: { isRead: true, readAt: new Date() } });
        return res.json({ message: "All Notifications marked as read", updatedCount: result.modifiedCount || 0 });
    } catch (error) {
        return res.status(500).json({ error: "Notifications could not be marked read" });
    }
}

export async function getUnreadNotificationCount(req, res) {
    try {
        const unreadCount = await Notification.countDocuments({ ...notificationFilter(req.communicationParticipant), isRead: false });
        return res.json({ unreadCount });
    } catch (error) {
        return res.status(500).json({ error: "Unread Notification count could not be loaded" });
    }
}
