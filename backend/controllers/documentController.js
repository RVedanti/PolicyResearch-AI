const fs = require("fs");
const axios = require("axios");
const { PDFParse } = require("pdf-parse");

const Document = require("../models/Document");
const Project = require("../models/Project");
const chunkText = require("../utils/textChunker");

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  "http://127.0.0.1:8000";


// =========================
// Upload Document
// =========================

const uploadDocument = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "PDF file is required",
      });
    }

    // Check that project belongs to logged-in user
    const project = await Project.findOne({
      _id: projectId,
      owner: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // =========================
    // Read uploaded PDF
    // =========================

    const pdfBuffer = fs.readFileSync(req.file.path);

    const parser = new PDFParse({
      data: pdfBuffer,
    });

    const pdfData = await parser.getText();

    let extractedText = pdfData.text;

    // =========================
    // Clean extracted text
    // =========================

    // Remove PDF page markers
    extractedText = extractedText.replace(
      /--\s*\d+\s+of\s+\d+\s*--/g,
      ""
    );

    // Remove repeated document header
    extractedText = extractedText.replace(
      /National Strategy for Artificial Intelligence/g,
      ""
    );

    // Remove intentionally blank page text
    extractedText = extractedText.replace(
      /This page has been intentionally left blank/g,
      ""
    );

    // Clean extra whitespace
    extractedText = extractedText
      .replace(/\n\s*\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();

    // =========================
    // Create chunks
    // =========================

    const chunks = chunkText(
      extractedText,
      150,
      50
    );

    await parser.destroy();

    // =========================
    // Save document in MongoDB
    // =========================

    const document = await Document.create({
      project: projectId,
      uploadedBy: req.user.userId,
      originalName: req.file.originalname,
      filePath: req.file.path,
      extractedText,
      chunks,
      fileSize: req.file.size,
    });

    // =========================
    // Index document in Qdrant
    // =========================

    const chunkTexts = chunks.map((chunk) => {
      if (typeof chunk === "string") {
        return chunk;
      }

      return chunk.text;
    });

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/index-document`,
      {
        document_id: document._id.toString(),
        chunks: chunkTexts.map((text) => ({
          text,
        })),
      }
    );

    if (!aiResponse.data.success) {
      console.error(
        "Qdrant indexing failed:",
        aiResponse.data.message
      );

      return res.status(500).json({
        success: false,
        message: "Document saved but indexing failed",
      });
    }

    // =========================
    // Success
    // =========================

    res.status(201).json({
      success: true,
      message: "PDF uploaded, processed and indexed successfully",

      document: {
        id: document._id,
        originalName: document.originalName,
        fileSize: document.fileSize,
        textLength: extractedText.length,
        chunksCount: chunks.length,
      },

      indexing: {
        chunksIndexed: aiResponse.data.chunks_indexed,
      },
    });

  } catch (error) {

    console.error(
      "Document upload error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to process PDF",
    });
  }
};


// =========================
// Get Document Chunks
// =========================
const getDocumentChunks = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findOne({
      _id: documentId,
      uploadedBy: req.user.userId,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.json({
      success: true,
      document: {
        id: document._id,
        originalName: document.originalName,
        totalChunks: document.chunks.length,
        chunks: document.chunks,
      },
    });

  } catch (error) {
    console.error(
      "Get chunks error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to retrieve document chunks",
    });
  }
};
const getProjectDocuments = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({
      _id: projectId,
      owner: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const documents = await Document.find({
      project: projectId,
      uploadedBy: req.user.userId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      documents: documents.map((document) => ({
        id: document._id,
        originalName: document.originalName,
        fileSize: document.fileSize,
        chunksCount: document.chunks.length,
        createdAt: document.createdAt,
      })),
    });

  } catch (error) {
    console.error(
      "Get project documents error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to retrieve documents",
    });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findOne({
      _id: documentId,
      uploadedBy: req.user.userId,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    await Document.deleteOne({
      _id: documentId,
    });

    res.json({
      success: true,
      message: "Document deleted successfully",
    });

  } catch (error) {
    console.error(
      "Delete document error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to delete document",
    });
  }
};
// =========================
// Resume Document Indexing
// =========================

const resumeDocumentIndexing = async (req, res) => {
  try {
    const { documentId } = req.params;

    // Check document belongs to logged-in user
    const document = await Document.findOne({
      _id: documentId,
      uploadedBy: req.user.userId,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Check project belongs to logged-in user
    const project = await Project.findOne({
      _id: document.project,
      owner: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (!document.chunks || document.chunks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Document has no chunks",
      });
    }

    // Convert chunks to text
    const chunkTexts = document.chunks.map((chunk) => {
      if (typeof chunk === "string") {
        return chunk;
      }

      return chunk.text;
    });

    console.log(
      `Resuming indexing for document ${documentId}`
    );

    console.log(
      `Total MongoDB chunks: ${chunkTexts.length}`
    );

    // Send existing chunks to AI service
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/index-document`,
      {
        document_id: documentId,
        chunks: chunkTexts.map((text) => ({
          text,
        })),
      },
      {
        timeout: 0,
      }
    );

    if (!aiResponse.data.success) {
      return res.status(500).json({
        success: false,
        message:
          aiResponse.data.message ||
          "Document indexing failed",
      });
    }

    return res.json({
      success: true,
      message:
        "Document indexing resumed successfully",
      indexing: {
        chunksTotal:
          aiResponse.data.chunks_total,
        chunksIndexed:
          aiResponse.data.chunks_indexed,
        chunksSkipped:
          aiResponse.data.chunks_skipped,
      },
    });

  } catch (error) {
    console.error(
      "Resume indexing error:",
      error.response?.data ||
        error.message
    );

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to resume document indexing",
    });
  }
};
module.exports = {
  uploadDocument,
  getProjectDocuments,
  getDocumentChunks,
  resumeDocumentIndexing,
};