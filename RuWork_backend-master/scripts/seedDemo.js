import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import Application from "../models/application.js";
import Job from "../models/job.js";
import JobProvider from "../models/jobProvider.js";
import Review from "../models/review.js";
import User from "../models/user.js";
import { JOB_PROVIDER_ROLE, STUDENT_ROLE, UNIVERSITY_NAME } from "../utils/account.js";
import { isProduction } from "../utils/env.js";
import { logger } from "../utils/logger.js";
import { recalculateReviewAggregates } from "../utils/ratingAggregates.js";

/**
 * Demo/QA data for a non-production environment. Every record is namespaced by the marker below
 * and the script is idempotent: a second run replaces only its own records and never touches
 * real accounts, Jobs, Applications, Reviews, Messages, Notifications, or audit history.
 */
const DEMO_MARKER = "ruwork-demo";
const DEMO_STUDENT_EMAIL = `${DEMO_MARKER}.student@ruh.ac.lk`;
const DEMO_PROVIDER_EMAIL = `${DEMO_MARKER}.provider@example.com`;

function requireDemoPassword() {
    const password = process.env.DEMO_PASSWORD;
    if (typeof password !== "string" || password.length < 8) {
        throw new Error("DEMO_PASSWORD must be set to at least 8 characters before seeding demo data");
    }
    return password;
}

async function removeExistingDemoData() {
    const student = await User.findOne({ email: DEMO_STUDENT_EMAIL });
    const provider = await JobProvider.findOne({ companyEmail: DEMO_PROVIDER_EMAIL });
    const providerId = provider?._id;
    if (providerId) {
        const jobs = await Job.find({ jobProviderId: providerId }).select("_id").lean();
        const jobIds = jobs.map((job) => job._id);
        await Review.deleteMany({ jobId: { $in: jobIds } });
        await Application.deleteMany({ jobId: { $in: jobIds } });
        await Job.deleteMany({ _id: { $in: jobIds } });
    }
    if (student) await User.deleteOne({ _id: student._id });
    if (provider) await JobProvider.deleteOne({ _id: provider._id });
}

async function seedDemo() {
    if (isProduction()) {
        throw new Error("Demo seeding is disabled when NODE_ENV is production");
    }
    const mongoUrl = process.env.MONGODB_URI?.trim();
    if (!mongoUrl) throw new Error("MONGODB_URI is not configured");
    const password = await bcrypt.hash(requireDemoPassword(), 10);

    await mongoose.connect(mongoUrl);
    await removeExistingDemoData();

    const student = await User.create({
        firstName: "Demo", lastName: "Student", email: DEMO_STUDENT_EMAIL,
        phoneNumber: "0710000000", dateOfBirth: new Date("2003-04-12"), gender: "Prefer not to say",
        password, university: UNIVERSITY_NAME, faculty: "Technology", fieldOfStudy: "ICT",
        yearOfStudy: "2nd Year", isEmailVerified: true, accountStatus: "approved", role: STUDENT_ROLE
    });

    const provider = await JobProvider.create({
        companyName: "Demo Technologies", companyEmail: DEMO_PROVIDER_EMAIL, phoneNumber: "0711111111",
        companyAddress: "Matara", companySize: "11-50", industry: "Technology",
        companyDescription: "Seeded demo Job Provider for local verification.",
        firstName: "Demo", lastName: "Manager", password,
        isEmailVerified: true, accountStatus: "approved", role: JOB_PROVIDER_ROLE
    });

    const openJob = await Job.create({
        jobProviderId: provider._id, companyName: provider.companyName, jobTitle: "Research Assistant",
        jobDescription: "Assist with a short research report and organise the findings.",
        category: "Data Entry", scope: "Prepare one dataset and a summary.", location: "Matara",
        workingHours: "Flexible", requiredSkills: ["Research", "Data Entry"], suitableFor: "2nd Year",
        applicationDeadline: new Date(Date.now() + 30 * 86400000), budgetType: "fixed", budget: 10000,
        status: "open"
    });

    const completedJob = await Job.create({
        jobProviderId: provider._id, companyName: provider.companyName, jobTitle: "Campus Survey Support",
        jobDescription: "Collected survey responses across the faculty and cleaned the results.",
        category: "Data Entry", scope: "Collect and clean 100 responses.", location: "Matara",
        workingHours: "Weekends", requiredSkills: ["Data Entry"], suitableFor: "Any Year",
        applicationDeadline: new Date(Date.now() + 7 * 86400000), budgetType: "hourly", hourlyRate: 800,
        status: "closed"
    });

    await Application.create({
        jobId: openJob._id, studentId: student._id, jobProviderId: provider._id,
        studentNote: "I have prepared research datasets for two previous faculty projects and can start this week.",
        budgetType: "fixed", originalBudget: 10000, status: "pending_review"
    });

    const completedApplication = await Application.create({
        jobId: completedJob._id, studentId: student._id, jobProviderId: provider._id,
        studentNote: "I completed a similar survey collection task for the faculty last semester.",
        budgetType: "hourly", originalHourlyRate: 800, approvedHourlyRate: 850, status: "completed"
    });

    await Review.create({
        applicationId: completedApplication._id, jobId: completedJob._id,
        studentId: student._id, jobProviderId: provider._id,
        rating: 5, comment: "Clear scope and professional communication throughout."
    });
    await recalculateReviewAggregates(completedJob._id, provider._id);

    logger.info("Demo data seeded", {
        studentEmail: DEMO_STUDENT_EMAIL,
        providerEmail: DEMO_PROVIDER_EMAIL,
        jobs: 2,
        applications: 2,
        reviews: 1
    });
    logger.info("Sign in with DEMO_PASSWORD; the value is never printed by this script.");
}

seedDemo()
    .catch((error) => {
        logger.error("Demo seeding failed", { message: error.message });
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => {});
    });
