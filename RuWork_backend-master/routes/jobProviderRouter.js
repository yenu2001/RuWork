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
    changePassword,
    logoutAllSessions,
    requestPasswordReset,
    resetPassword
} from "../controllers/passwordController.js";
import {
    authenticateToken,
    isJobProvider,
    requireApprovedJobProvider
} from "../middlewears/authMiddleware.js";
import { authRateLimiter, sensitiveRateLimiter } from "../middlewears/security.js";

const JobProviderRouter = express.Router();

JobProviderRouter.post("/", sensitiveRateLimiter, registerJobProvider);
JobProviderRouter.post("/login", authRateLimiter, loginJobProvider);
JobProviderRouter.get("/verify-email/:token", authRateLimiter, verifyJobProviderEmail);
JobProviderRouter.post("/resend-verification", sensitiveRateLimiter, resendJobProviderVerification);
JobProviderRouter.post("/password/forgot", sensitiveRateLimiter, requestPasswordReset("jobProvider"));
JobProviderRouter.post("/password/reset", authRateLimiter, resetPassword("jobProvider"));
JobProviderRouter.patch("/password", authenticateToken, isJobProvider, authRateLimiter, changePassword("jobProvider"));
JobProviderRouter.post("/logout", authenticateToken, isJobProvider, logoutAllSessions("jobProvider"));
JobProviderRouter.get("/profile", authenticateToken, isJobProvider, requireApprovedJobProvider, getMyCompanyProfile);
JobProviderRouter.patch("/profile", authenticateToken, isJobProvider, requireApprovedJobProvider, updateMyCompanyProfile);
JobProviderRouter.get("/dashboard", authenticateToken, isJobProvider, requireApprovedJobProvider, getProviderDashboard);
JobProviderRouter.get("/reviews", authenticateToken, isJobProvider, requireApprovedJobProvider, listProviderReviews);

export default JobProviderRouter;
