import mongoose from "mongoose";
import Notification from "../models/notification.js";
import { isTestEnvironment } from "./env.js";
import { logger } from "./logger.js";

export const PARTICIPANT_TYPES = ["student", "jobProvider"];
export const NOTIFICATION_TYPES = [
    "NEW_APPLICATION",
    "APPLICATION_ACCEPTED",
    "APPLICATION_DECLINED",
    "APPLICATION_WITHDRAWN",
    "APPLICATION_CANCELLED",
    "APPLICATION_COMPLETED",
    "NEW_MESSAGE"
];

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const originalNotificationCreate = Notification.create;

export class CommunicationInputError extends Error {}

export function identifier(value) {
    return value?._id?.toString?.() || value?.toString?.() || String(value || "");
}

export function communicationPagination(query = {}, defaultLimit = DEFAULT_LIMIT) {
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? defaultLimit : Number(query.limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
        throw new CommunicationInputError(`Pagination requires positive integers and a limit no greater than ${MAX_LIMIT}`);
    }
    return { page, limit };
}

export function participantType(value) {
    if (!PARTICIPANT_TYPES.includes(value)) throw new CommunicationInputError("Invalid participant type");
    return value;
}

export function messageContent(value) {
    if (typeof value !== "string") throw new CommunicationInputError("Message content is required");
    const content = value.trim();
    if (!content) throw new CommunicationInputError("Message content cannot be empty");
    if (content.length > 2000) throw new CommunicationInputError("Message content cannot exceed 2000 characters");
    return content;
}

export function notificationMessage(value) {
    if (typeof value !== "string" || !value.trim()) throw new CommunicationInputError("Notification message is required");
    const message = value.trim();
    if (message.length > 500) throw new CommunicationInputError("Notification message cannot exceed 500 characters");
    return message;
}

export function booleanQuery(value, field = "filter") {
    if (value === undefined) return undefined;
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    throw new CommunicationInputError(`${field} must be true or false`);
}

export async function createNotification({ recipientType, recipientId, type, message, relatedJobId, relatedApplicationId, relatedMessageId }) {
    participantType(recipientType);
    if (!mongoose.isValidObjectId(recipientId)) throw new CommunicationInputError("A valid Notification recipient is required");
    if (!NOTIFICATION_TYPES.includes(type)) throw new CommunicationInputError("Invalid Notification type");
    return Notification.create({
        recipientType,
        recipientId,
        type,
        message: notificationMessage(message),
        relatedJobId: relatedJobId || undefined,
        relatedApplicationId: relatedApplicationId || undefined,
        relatedMessageId: relatedMessageId || undefined
    });
}

export async function createNotificationSafely(details) {
    // Same explicit Phase 10 gate as utils/admin.js: the test-only fallback requires the
    // environment flag, so a dropped production connection cannot silently skip a Notification.
    if (isTestEnvironment() && mongoose.connection.readyState === 0 && Notification.create === originalNotificationCreate) {
        return null;
    }
    try {
        return await createNotification(details);
    } catch (error) {
        // Best-effort by design: the core Application/Message action already succeeded.
        logger.warn("Notification creation failed after a successful business action", { name: error?.name });
        return null;
    }
}
