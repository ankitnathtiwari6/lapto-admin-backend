import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import connectDB from "./config/database";
import { errorHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./routes/authRoutes";
import deviceTypeRoutes from "./routes/deviceTypeRoutes";
import serviceTypeRoutes from "./routes/serviceTypeRoutes";
import productRoutes from "./routes/productRoutes";
import orderRoutes from "./routes/orderRoutes";
import userRoutes from "./routes/userRoutes";
import staffRoutes from "./routes/staffRoutes";
import customerRoutes from "./routes/customerRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import stageRoutes from "./routes/stageRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import companyRoutes from "./routes/companyRoutes";
import companySettingsRoutes from "./routes/companySettingsRoutes";
import accountingRoutes from "./routes/accountingRoutes";
import aiRoutes from "./routes/aiRoutes";
import laptoAdminRoutes from "./routes/laptoAdminRoutes";
import subTaskRoutes from "./routes/subTaskRoutes";
import activityLogRoutes from "./routes/activityLogRoutes";
import engineerRoutes from "./routes/engineerRoutes";
import taskTypeRoutes from "./routes/taskTypeRoutes";
import outcomeTypeRoutes from "./routes/outcomeTypeRoutes";

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Create Express app
const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date(),
  });
});

// Mount routers
app.use("/api/auth", authRoutes);
app.use("/api/lapto-admin", laptoAdminRoutes); // Lapto Admin routes (no auth required, password-based)
app.use("/api/companies", companyRoutes);
app.use("/api/device-types", deviceTypeRoutes);
app.use("/api/service-types", serviceTypeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes); // Legacy route - keep for backward compatibility
app.use("/api/staff", staffRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/stages", stageRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/company-settings", companySettingsRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api", subTaskRoutes); // Sub-task routes
app.use("/api/activity-logs", activityLogRoutes); // Activity log routes
app.use("/api/engineer", engineerRoutes); // Engineer-specific routes
app.use("/api/task-types", taskTypeRoutes); // Task type routes
app.use("/api/outcome-types", outcomeTypeRoutes); // Outcome type routes

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

export default app;
