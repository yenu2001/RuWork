import express from "express";
import {
    getMyCompanyProfile,
    getProviderDashboard,
    loginJobProvider,
    registerJobProvider,
    updateMyCompanyProfile
} from "../controllers/jobProviderController.js";
import { listProviderReviews } from "../controllers/reviewController.js";
import {
    resendJobProviderVerification,
    verifyJobProviderEmail
} from "../controllers/emailVerificationController.js";
import {
    authenticateToken,
    isJobProvider,
    requireApprovedJobProvider
} from "../middlewears/authMiddleware.js";

const JobProviderRouter = express.Router();

JobProviderRouter.post("/",registerJobProvider);
JobProviderRouter.post("/login",loginJobProvider);
JobProviderRouter.get("/verify-email/:token", verifyJobProviderEmail);
JobProviderRouter.post("/resend-verification", resendJobProviderVerification);
JobProviderRouter.get("/profile", authenticateToken, isJobProvider, requireApprovedJobProvider, getMyCompanyProfile);
JobProviderRouter.patch("/profile", authenticateToken, isJobProvider, requireApprovedJobProvider, updateMyCompanyProfile);
JobProviderRouter.get("/dashboard", authenticateToken, isJobProvider, requireApprovedJobProvider, getProviderDashboard);
JobProviderRouter.get("/reviews", authenticateToken, isJobProvider, requireApprovedJobProvider, listProviderReviews);

export default JobProviderRouter;
