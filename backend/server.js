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

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/rag", ragRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/rag", ragRoutes);
// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "PolicyResearch AI backend is running",
  });
});
app.use(
  "/api/saved",
  savedRoutes
);
app.use(
  "/api/dashboard",
  dashboardRoutes
);
app.use(
  "/api/history",
  historyRoutes
);
// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
// Project routes
app.use("/api/projects", projectRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});