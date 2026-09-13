const express = require("express");
const cors = require("cors");
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