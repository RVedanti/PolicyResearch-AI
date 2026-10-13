const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const documentRoutes = require("./routes/documentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const ragRoutes = require("./routes/ragRoutes");
const savedRoutes = require("./routes/savedRoutes");
const historyRoutes = require("./routes/historyRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// =========================
// Connect to MongoDB
// =========================

connectDB();

// =========================
// Middleware
// =========================

app.use(cors());
app.use(express.json());

// =========================
// Health Check
// =========================

// Called once a day by .github/workflows/keepalive.yml.
// A real query keeps the free MongoDB Atlas cluster from being paused
// after 30 days without connections.
app.get("/api/keepalive", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    const users = await mongoose.connection.db
      .collection("users")
      .estimatedDocumentCount();

    res.json({ success: true, mongodb: "ok", users });
  } catch (error) {
    res.status(503).json({
      success: false,
      mongodb: "error",
      message: error.message,
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "PolicyResearch AI backend is running",
  });
});

// =========================
// Routes
// =========================

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/saved", savedRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/dashboard", dashboardRoutes);

// =========================
// Start Server
// =========================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});