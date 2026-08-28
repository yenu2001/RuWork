import express from "express";
import {
    getUnreadNotificationCount,
    listNotifications,
    markAllNotificationsRead,
    markNotificationRead
} from "../controllers/notificationController.js";
import { authenticateToken, requireCommunicationParticipant } from "../middlewears/authMiddleware.js";

const notificationRouter = express.Router();

notificationRouter.use(authenticateToken, requireCommunicationParticipant);
notificationRouter.get("/unread-count", getUnreadNotificationCount);
notificationRouter.get("/", listNotifications);
notificationRouter.patch("/read-all", markAllNotificationsRead);
notificationRouter.patch("/:id/read", markNotificationRead);

export default notificationRouter;
