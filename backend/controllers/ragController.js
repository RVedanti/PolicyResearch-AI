const { askRAG } = require("../services/aiService");
const History = require("../models/History");
const Project = require("../models/Project");
const Document = require("../models/Document");

// =========================
// Ask RAG Question
// =========================

const askQuestion = async (req, res) => {
  try {
    const {
      question,
      documentId,
    } = req.body;

    // -------------------------
    // Validate question
    // -------------------------

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    // -------------------------
    // Validate document
    // -------------------------

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: "Document ID is required",
      });
    }

    // -------------------------
    // Get JWT
    // -------------------------

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const jwtToken =
      authHeader.replace("Bearer ", "");

    // -------------------------
    // Verify document ownership
    // -------------------------

    const document =
      await Document.findOne({
        _id: documentId,
        uploadedBy: req.user.userId,
      });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // -------------------------
    // Verify project ownership
    // -------------------------

    const project =
      await Project.findOne({
        _id: document.project,
        owner: req.user.userId,
      });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // -------------------------
    // Generate RAG answer
    // -------------------------

    const result = await askRAG(
      question,
      jwtToken,
      documentId
    );

    // -------------------------
    // Debug RAG response
    // -------------------------

    console.log(
      "RAG service response:",
      JSON.stringify(result, null, 2)
    );

    // -------------------------
    // Validate RAG answer
    // -------------------------

    if (
      !result ||
      !result.success ||
      !result.answer ||
      !result.answer.trim()
    ) {
      console.error(
        "RAG returned no valid answer:",
        result
      );

      return res.status(502).json({
        success: false,
        message:
          result?.message ||
          "AI service did not return a valid answer",
      });
    }

    // -------------------------
    // Save history
    // -------------------------

    try {
      await History.create({
        user: req.user.userId,
        project: project._id,
        document: document._id,
        question: question.trim(),
        answer: result.answer,
        sources: result.sources || [],
      });

      console.log(
        "RAG history saved successfully"
      );

    } catch (historyError) {
      /*
       * History failure should NOT break
       * an otherwise successful RAG response.
       */

      console.error(
        "History save error:",
        historyError.message
      );
    }

    // -------------------------
    // Return RAG result
    // -------------------------

    return res.json(result);

  } catch (error) {

    console.error(
      "RAG controller error:",
      error.response?.data ||
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate answer",
    });
  }
};
// =========================
// Export Controller
// =========================

module.exports = {
  askQuestion,
};