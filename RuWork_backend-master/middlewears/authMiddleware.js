import jwt from "jsonwebtoken";
import Admin from "../models/admin.js";
import JobProvider from "../models/jobProvider.js";
import User from "../models/user.js";
import {
    ADMIN_ROLE,
    JOB_PROVIDER_ROLE,
    STUDENT_ROLE,
    UNIVERSITY_NAME,
    hasBasicEmailFormat,
    isAllowedStudentEmail,
    isTokenVersionCurrent
} from "../utils/account.js";

const REVOKED_TOKEN_RESPONSE = {
    error: "This session is no longer valid. Please sign in again.",
    code: "TOKEN_REVOKED"
};

export function authenticateToken(req, res, next) {
    const authorizationHeader = req.get("Authorization") || "";
    const [scheme, token] = authorizationHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Authentication is required" });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        return next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired authentication token" });
    }
}

export function authorizeRoles(...allowedRoles) {
    return function authorizeRole(req, res, next) {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: "You are not authorized to access this resource"
            });
        }

        return next();
    };
}

export const isAdmin = authorizeRoles(ADMIN_ROLE);
export const isJobProvider = authorizeRoles(JOB_PROVIDER_ROLE);
export const isStudent = authorizeRoles(STUDENT_ROLE);

export async function requireAdminAccount(req, res, next) {
    try {
        const admin = await Admin.findById(req.user?.sub);
        if (!admin || admin.role !== ADMIN_ROLE) {
            return res.status(403).json({ error: "An authoritative Admin account is required", code: "ADMIN_NOT_AUTHORIZED" });
        }
        if (!isTokenVersionCurrent(req.user, admin)) {
            return res.status(401).json(REVOKED_TOKEN_RESPONSE);
        }
        req.adminAccount = admin;
        return next();
    } catch (error) {
        return res.status(403).json({ error: "An authoritative Admin account is required", code: "ADMIN_NOT_AUTHORIZED" });
    }
}

export async function requireEligibleRuhunaStudent(req, res, next) {
    try {
        const student = await User.findById(req.user?.sub);

        if (!student ||
            student.role !== STUDENT_ROLE ||
            !isAllowedStudentEmail(student.email) ||
            student.university !== UNIVERSITY_NAME ||
            !student.isEmailVerified ||
            student.accountStatus !== "approved" ||
            student.moderationStatus === "suspended") {
            return res.status(403).json({
                error: "An approved and verified University of Ruhuna Student account is required",
                code: "STUDENT_NOT_ELIGIBLE"
            });
        }

        if (!isTokenVersionCurrent(req.user, student)) {
            return res.status(401).json(REVOKED_TOKEN_RESPONSE);
        }

        req.studentAccount = student;
        return next();
    } catch (error) {
        return res.status(403).json({
            error: "An approved and verified University of Ruhuna Student account is required",
            code: "STUDENT_NOT_ELIGIBLE"
        });
    }
}

export async function requireApprovedJobProvider(req, res, next) {
    try {
        const provider = await JobProvider.findById(req.user?.sub);

        if (!provider ||
            provider.role !== JOB_PROVIDER_ROLE ||
            !hasBasicEmailFormat(provider.companyEmail) ||
            !provider.isEmailVerified ||
            provider.accountStatus !== "approved" ||
            provider.moderationStatus === "suspended") {
            return res.status(403).json({
                error: "An approved and verified Job Provider account is required",
                code: "JOB_PROVIDER_NOT_ELIGIBLE"
            });
        }

        if (!isTokenVersionCurrent(req.user, provider)) {
            return res.status(401).json(REVOKED_TOKEN_RESPONSE);
        }

        req.jobProviderAccount = provider;
        return next();
    } catch (error) {
        return res.status(403).json({
            error: "An approved and verified Job Provider account is required",
            code: "JOB_PROVIDER_NOT_ELIGIBLE"
        });
    }
}

export function requireCommunicationParticipant(req, res, next) {
    if (req.user?.role === STUDENT_ROLE) {
        return requireEligibleRuhunaStudent(req, res, () => {
            req.communicationParticipant = { type: "student", id: req.studentAccount._id, account: req.studentAccount };
            return next();
        });
    }
    if (req.user?.role === JOB_PROVIDER_ROLE) {
        return requireApprovedJobProvider(req, res, () => {
            req.communicationParticipant = { type: "jobProvider", id: req.jobProviderAccount._id, account: req.jobProviderAccount };
            return next();
        });
    }
    return res.status(403).json({ error: "Messaging and Notifications are available only to Students and Job Providers" });
}
