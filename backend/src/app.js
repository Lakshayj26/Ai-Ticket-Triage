import express from "express";
import authRouter from "./routes/auth.routes.js";
import ticketRouter from "./routes/ticket.routes.js";
import organizationRouter from "./routes/organization.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/client.js";

const app = express();

// Basic configuration middlewares
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// CORS configuration (enabling requests from our frontend dev server)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "OPTIONS", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
  })
);

// Route registration
app.get("/api/v1/users/verify-email/:token", (req, res) => {
  const token = req.params.token;
  return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/verify-email?token=${token}`);
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/tickets", ticketRouter);
app.use("/api/v1/organizations", organizationRouter);

// Inngest background function server mounting
app.use("/api/inngest", serve({ client: inngest, functions }));

// Global error handling middleware for handling ApiError cleanly in JSON format
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const errors = err.errors || [];

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    data: null,
  });
});

export default app;