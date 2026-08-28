import express from "express";
import {
    createReview,
    deleteMyReview,
    getMyReviewForApplication
} from "../controllers/reviewController.js";
import {
    authenticateToken,
    isStudent,
    requireEligibleRuhunaStudent
} from "../middlewears/authMiddleware.js";

const reviewRouter = express.Router();

reviewRouter.use(authenticateToken, isStudent, requireEligibleRuhunaStudent);
reviewRouter.post("/", createReview);
reviewRouter.get("/my/application/:applicationId", getMyReviewForApplication);
reviewRouter.delete("/:id", deleteMyReview);

export default reviewRouter;
