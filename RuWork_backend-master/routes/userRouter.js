import express from "express";
import {
    getMyProfile,
    getStudentDashboard,
    getStudentJobHistory,
    loginUser,
    registerUser,
    updateMyProfile
} from "../controllers/userController.js";
import {
    resendStudentVerification,
    verifyStudentEmail
} from "../controllers/emailVerificationController.js";
import {
    changePassword,
    logoutAllSessions,
    requestPasswordReset,
    resetPassword
} from "../controllers/passwordController.js";
import {
    authenticateToken,
    isStudent,
    requireEligibleRuhunaStudent
} from "../middlewears/authMiddleware.js";
import { authRateLimiter, sensitiveRateLimiter } from "../middlewears/security.js";

const userRouter = express.Router();

userRouter.post("/", sensitiveRateLimiter, registerUser);
userRouter.post("/login", authRateLimiter, loginUser);
userRouter.get("/verify-email/:token", authRateLimiter, verifyStudentEmail);
userRouter.post("/resend-verification", sensitiveRateLimiter, resendStudentVerification);
userRouter.post("/password/forgot", sensitiveRateLimiter, requestPasswordReset("student"));
userRouter.post("/password/reset", authRateLimiter, resetPassword("student"));
userRouter.patch("/password", authenticateToken, isStudent, authRateLimiter, changePassword("student"));
userRouter.post("/logout", authenticateToken, isStudent, logoutAllSessions("student"));
userRouter.get("/profile", authenticateToken, isStudent, requireEligibleRuhunaStudent, getMyProfile);
userRouter.patch("/profile", authenticateToken, isStudent, requireEligibleRuhunaStudent, updateMyProfile);
userRouter.get("/dashboard", authenticateToken, isStudent, requireEligibleRuhunaStudent, getStudentDashboard);
userRouter.get("/job-history", authenticateToken, isStudent, requireEligibleRuhunaStudent, getStudentJobHistory);

export default userRouter;
