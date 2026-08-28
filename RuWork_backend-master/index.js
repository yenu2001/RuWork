import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import userRouter from "./routes/userRouter.js";
import adminRouter from "./routes/adminRouter.js";
import JobProviderRouter from "./routes/jobProviderRouter.js";
import jobRouter from "./routes/jobRouter.js";
import applicationRouter from "./routes/applicationRouter.js";
import reviewRouter from "./routes/reviewRouter.js";
import messageRouter from "./routes/messageRouter.js";
import notificationRouter from "./routes/notificationRouter.js";
import { getHealth } from "./controllers/healthController.js";
import { errorHandler, notFoundHandler, requireObjectBody } from "./middlewears/errorHandler.js";
import { apiRateLimiter, corsPolicy, securityHeaders } from "./middlewears/security.js";
import { assertEnvironment, getJsonBodyLimit, getPort, getTrustProxySetting } from "./utils/env.js";
import { logger } from "./utils/logger.js";

const app = express();

// Order matters: security headers and origin policy first, then bounded body parsing, then the
// rate limiter, then routes, and finally the 404 and terminal error handlers.
app.disable("x-powered-by");
app.set("trust proxy", getTrustProxySetting());
app.use(securityHeaders());
app.use(corsPolicy());
app.use(express.json({ limit: getJsonBodyLimit() }));
app.use(requireObjectBody);
app.use(apiRateLimiter);

app.get("/api/health", getHealth);
app.use("/api/users", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/jobProviders", JobProviderRouter);
app.use("/api/jobs", jobRouter);
app.use("/api/applications", applicationRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/messages", messageRouter);
app.use("/api/notifications", notificationRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
    assertEnvironment();

    await mongoose.connect(process.env.MONGODB_URI.trim());
    logger.info("MongoDB connection established");

    const server = app.listen(getPort(), () => {
        logger.info("RuWork API started", { port: getPort(), environment: process.env.NODE_ENV || "development" });
    });

    // The connection can drop after a successful start; surface it without leaking the URI.
    mongoose.connection.on("disconnected", () => logger.warn("MongoDB connection lost"));
    mongoose.connection.on("reconnected", () => logger.info("MongoDB connection restored"));
    mongoose.connection.on("error", (error) => logger.error("MongoDB connection error", { name: error?.name }));

    const shutdown = async (signal) => {
        logger.info("Shutting down", { signal });
        server.close();
        await mongoose.connection.close().catch(() => {});
        process.exit(0);
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error) => {
    logger.error("Server startup failed", { message: error?.message });
    process.exitCode = 1;
});

export default app;
