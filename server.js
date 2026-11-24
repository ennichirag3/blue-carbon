import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import db from "./database.js";
import userRoutes from "./routes/userRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import blockchainRoutes from "./routes/blockchain.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));

// --- API Routes ---
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/blockchain", blockchainRoutes);

// --- Health / Info Endpoint ---
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    database: "SQLite (Built-in WAL Mode)",
    version: "2.0.0-spatial-3d",
    timestamp: new Date().toISOString()
  });
});

// --- API Root Endpoint ---
app.get("/api", (req, res) => {
  res.json({
    name: "Blue Carbon Spatial Platform API",
    version: "2.0.0",
    database: "SQLite",
    endpoints: [
      "/api/users",
      "/api/projects",
      "/api/blockchain",
      "/api/health"
    ]
  });
});

// Fallback to index.html for SPA routing
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("💥 Server Error:", err.stack);
  res.status(500).json({ message: "Internal Server Error", error: err.message });
});

// --- Start Server ---
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`⚡ Blue Carbon Spatial Server running on port ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`💾 Database: SQLite (Zero External Config Required)`);
});

// --- Graceful Shutdown ---
const gracefulShutdown = () => {
  console.log("\n🛑 Shutting down gracefully...");
  try {
    db.close();
  } catch (e) {}
  server.close(() => {
    console.log("✅ Server closed. Database disconnected.");
    process.exit(0);
  });
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

export default app;
