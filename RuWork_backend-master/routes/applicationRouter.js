import express from "express";
import {
    acceptApplication,
    cancelMyApplication,
    completeApplication,
    declineApplication,
    getMyApplication,
    getMyApplicationForJob,
    getProviderApplication,
    listMyApplications,
    withdrawMyApplication
} from "../controllers/applicationController.js";
import {
    authenticateToken,
    isJobProvider,
    isStudent,
    requireApprovedJobProvider,
    requireEligibleRuhunaStudent
} from "../middlewears/authMiddleware.js";

const applicationRouter = express.Router();

applicationRouter.use(authenticateToken);

applicationRouter.get("/my", isStudent, requireEligibleRuhunaStudent, listMyApplications);
applicationRouter.get("/my/job/:jobId", isStudent, requireEligibleRuhunaStudent, getMyApplicationForJob);
applicationRouter.get("/my/:id", isStudent, requireEligibleRuhunaStudent, getMyApplication);
applicationRouter.patch("/my/:id/withdraw", isStudent, requireEligibleRuhunaStudent, withdrawMyApplication);
applicationRouter.patch("/my/:id/cancel", isStudent, requireEligibleRuhunaStudent, cancelMyApplication);

applicationRouter.get("/provider/:id", isJobProvider, requireApprovedJobProvider, getProviderApplication);
applicationRouter.patch("/provider/:id/accept", isJobProvider, requireApprovedJobProvider, acceptApplication);
applicationRouter.patch("/provider/:id/decline", isJobProvider, requireApprovedJobProvider, declineApplication);
applicationRouter.patch("/provider/:id/complete", isJobProvider, requireApprovedJobProvider, completeApplication);

export default applicationRouter;
