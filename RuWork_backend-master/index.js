import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import userRouter from "./routes/userRouter.js";
import adminRouter from "./routes/adminRouter.js";
import JobProviderRouter from "./routes/jobProviderRouter.js";
import jobRouter from "./routes/jobRouter.js";
import applicationRouter from "./routes/applicationRouter.js";
import reviewRouter from "./routes/reviewRouter.js";
import messageRouter from "./routes/messageRouter.js";
import notificationRouter from "./routes/notificationRouter.js";

const app = express();

app.use(bodyParser.json());

app.use("/api/users", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/jobProviders", JobProviderRouter);
app.use("/api/jobs", jobRouter);
app.use("/api/applications", applicationRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/messages", messageRouter);
app.use("/api/notifications", notificationRouter);

async function startServer() {
    const mongoUrl = process.env.MONGODB_URI?.trim();
    const jwtSecret = process.env.JWT_SECRET?.trim();
    const port = Number(process.env.PORT) || 5000;

    if (!mongoUrl) {
        throw new Error("MONGODB_URI is not configured");
    }

    if (!jwtSecret) {
        throw new Error("JWT_SECRET is not configured");
    }

    await mongoose.connect(mongoUrl);
    console.log("MongoDB connection established successfully");

    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

startServer().catch((error) => {
    console.error(`Server startup failed: ${error.message}`);
    process.exitCode = 1;
});
