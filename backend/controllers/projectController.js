const Project = require("../models/Project");

// =========================
// Create Project
// =========================

const createProject = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Project title is required",
      });
    }

    const project = await Project.create({
      title,
      description,
      owner: req.user.userId,
    });

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });

  } catch (error) {
    console.error(
      "Create project error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// =========================
// Get User Projects
// =========================

const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      owner: req.user.userId,
    }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      projects,
    });

  } catch (error) {
    console.error(
      "Get projects error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to retrieve projects",
    });
  }
};


module.exports = {
  createProject,
  getProjects,
};