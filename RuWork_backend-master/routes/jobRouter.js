import express from "express";
import {
    createJob,
    deleteJob,
    getJob,
    getMyJob,
    listJobs,
    listMyJobs,
    updateJob
} from "../controllers/jobController.js";
import { applyToJob, listJobApplications } from "../controllers/applicationController.js";
import { listJobReviews } from "../controllers/reviewController.js";
import {
    authenticateToken,
    isJobProvider,
    isStudent,
    requireApprovedJobProvider,
    requireEligibleRuhunaStudent
} from "../middlewears/authMiddleware.js";

const jobRouter = express.Router();

jobRouter.get("/", listJobs);
jobRouter.get(
    "/my",
    authenticateToken,
    isJobProvider,
    requireApprovedJobProvider,
    listMyJobs
);
jobRouter.get("/:jobId/reviews", listJobReviews);
jobRouter.get(
    "/my/:id",
    authenticateToken,
    isJobProvider,
    requireApprovedJobProvider,
    getMyJob
);
jobRouter.post(
    "/",
    authenticateToken,
    isJobProvider,
    requireApprovedJobProvider,
    createJob
);
jobRouter.post(
    "/:jobId/applications",
    authenticateToken,
    isStudent,
    requireEligibleRuhunaStudent,
    applyToJob
);
jobRouter.get(
    "/:jobId/applications",
    authenticateToken,
    isJobProvider,
    requireApprovedJobProvider,
    listJobApplications
);
jobRouter.patch(
    "/:id",
    authenticateToken,
    isJobProvider,
    requireApprovedJobProvider,
    updateJob
);
jobRouter.delete(
    "/:id",
    authenticateToken,
    isJobProvider,
    requireApprovedJobProvider,
    deleteJob
);
jobRouter.get("/:id", getJob);

export default jobRouter;
