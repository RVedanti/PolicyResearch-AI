const SavedAnswer = require("../models/SavedAnswer");


// Get saved answers
const getSavedAnswers = async (req, res) => {
  try {
    const savedAnswers = await SavedAnswer.find({
      user: req.user.userId,
    })
      .populate("project", "title")
      .populate("document", "originalName")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      savedAnswers,
    });

  } catch (error) {
    console.error(
      "Get saved answers error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to retrieve saved answers",
    });
  }
};


// Save an answer
const saveAnswer = async (req, res) => {
  try {
    const {
      projectId,
      documentId,
      question,
      answer,
      sources,
    } = req.body;

    if (
      !projectId ||
      !documentId ||
      !question ||
      !answer
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    const savedAnswer =
      await SavedAnswer.create({
        user: req.user.userId,
        project: projectId,
        document: documentId,
        question: question.trim(),
        answer,
        sources: sources || [],
      });

    res.status(201).json({
      success: true,
      message: "Answer saved successfully",
      savedAnswer,
    });

  } catch (error) {
    console.error(
      "Save answer error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to save answer",
    });
  }
};


// Delete saved answer
const deleteSavedAnswer = async (req, res) => {
  try {
    const { savedId } = req.params;

    const savedAnswer =
      await SavedAnswer.findOne({
        _id: savedId,
        user: req.user.userId,
      });

    if (!savedAnswer) {
      return res.status(404).json({
        success: false,
        message: "Saved answer not found",
      });
    }

    await SavedAnswer.deleteOne({
      _id: savedId,
    });

    res.json({
      success: true,
      message: "Saved answer removed",
    });

  } catch (error) {
    console.error(
      "Delete saved answer error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to remove saved answer",
    });
  }
};


module.exports = {
  getSavedAnswers,
  saveAnswer,
  deleteSavedAnswer,
};