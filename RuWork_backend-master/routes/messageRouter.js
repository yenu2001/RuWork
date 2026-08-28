import express from "express";
import { getConversation, getUnreadMessageCount, listConversations, sendMessage } from "../controllers/messageController.js";
import { authenticateToken, requireCommunicationParticipant } from "../middlewears/authMiddleware.js";

const messageRouter = express.Router();

messageRouter.use(authenticateToken, requireCommunicationParticipant);
messageRouter.get("/unread-count", getUnreadMessageCount);
messageRouter.get("/conversations", listConversations);
messageRouter.get("/conversations/:applicationId", getConversation);
messageRouter.post("/", sendMessage);

export default messageRouter;
