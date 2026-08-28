import express from "express";
import {
    approveRegistration,
    getAdminJob,
    getAdminProvider,
    getAdminReview,
    getAdminSettings,
    getAdminStudent,
    getAdminDashboard,
    getRegistration,
    listAdminAudits,
    listAdminJobs,
    listAdminProviders,
    listAdminStudents,
    listRegistrations,
    loginAdmin,
    moderateJob,
    moderateProvider,
    moderateReview,
    moderateStudent,
    rejectRegistration,
    updateAdminSettings
} from "../controllers/adminController.js";
import { deleteReviewAsAdmin, listAdminReviews } from "../controllers/reviewController.js";
import {
    authenticateToken,
    isAdmin,
    requireAdminAccount
} from "../middlewears/authMiddleware.js";

const adminRouter = express.Router();

adminRouter.post("/login", loginAdmin);
adminRouter.use(authenticateToken, isAdmin, requireAdminAccount);
adminRouter.get("/dashboard", getAdminDashboard);
adminRouter.get("/reviews", listAdminReviews);
adminRouter.get("/reviews/:id", getAdminReview);
adminRouter.patch("/reviews/:id/moderation", moderateReview);
adminRouter.delete("/reviews/:id", deleteReviewAsAdmin);
adminRouter.get("/students", listAdminStudents);
adminRouter.get("/students/:id", getAdminStudent);
adminRouter.patch("/students/:id/moderation", moderateStudent);
adminRouter.get("/providers", listAdminProviders);
adminRouter.get("/providers/:id", getAdminProvider);
adminRouter.patch("/providers/:id/moderation", moderateProvider);
adminRouter.get("/jobs", listAdminJobs);
adminRouter.get("/jobs/:id", getAdminJob);
adminRouter.patch("/jobs/:id/moderation", moderateJob);
adminRouter.get("/settings", getAdminSettings);
adminRouter.patch("/settings", updateAdminSettings);
adminRouter.get("/audits", listAdminAudits);
adminRouter.get("/registrations", listRegistrations);
adminRouter.get(
    "/registrations/:type/:id",
    getRegistration
);
adminRouter.patch(
    "/registrations/:type/:id/approve",
    approveRegistration
);
adminRouter.patch(
    "/registrations/:type/:id/reject",
    rejectRegistration
);

export default adminRouter;
