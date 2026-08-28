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
    authenticateToken,
    isStudent,
    requireEligibleRuhunaStudent
} from "../middlewears/authMiddleware.js";

const userRouter = express.Router();

userRouter.post("/",registerUser);
userRouter.post("/login",loginUser);
userRouter.get("/verify-email/:token", verifyStudentEmail);
userRouter.post("/resend-verification", resendStudentVerification);
userRouter.get("/profile", authenticateToken, isStudent, requireEligibleRuhunaStudent, getMyProfile);
userRouter.patch("/profile", authenticateToken, isStudent, requireEligibleRuhunaStudent, updateMyProfile);
userRouter.get("/dashboard", authenticateToken, isStudent, requireEligibleRuhunaStudent, getStudentDashboard);
userRouter.get("/job-history", authenticateToken, isStudent, requireEligibleRuhunaStudent, getStudentJobHistory);

export default userRouter;
