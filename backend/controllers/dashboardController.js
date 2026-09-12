const Project = require("../models/Project");
const Document = require("../models/Document");
const SavedAnswer = require("../models/SavedAnswer");

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's projects
    const projects = await Project.find({
      owner: userId,
    }).select("_id");

    const projectIds = projects.map(
      (project) => project._id
    );

    // Get user's documents
    const documents = await Document.find({
      uploadedBy: userId,
    }).select("chunks");

    const totalChunks = documents.reduce(
      (total, document) =>
        total + (document.chunks?.length || 0),
      0
    );

    // Count saved answers
    const savedAnswers = await SavedAnswer.countDocuments({
      user: userId,
    });

    res.json({
      success: true,
      stats: {
        projects: projects.length,
        documents: documents.length,
        chunks: totalChunks,
        savedAnswers,
      },
    });

  } catch (error) {
    console.error(
      "Dashboard stats error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard statistics",
    });
  }
};

module.exports = {
  getDashboardStats,
};