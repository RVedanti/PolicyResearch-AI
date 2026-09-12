const express = require("express");

const {
  uploadDocument,
  getProjectDocuments,
  getDocumentChunks,
  resumeDocumentIndexing,
} = require("../controllers/documentController");

const protect = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const router = express.Router();


// =========================
// Upload PDF
// =========================

router.post(
  "/upload",
  protect,
  upload.single("file"),
  uploadDocument
);


// =========================
// Get documents of a project
// =========================

router.get(
  "/project/:projectId",
  protect,
  getProjectDocuments
);


// =========================
// Resume document indexing
// =========================

router.post(
  "/:documentId/resume-indexing",
  protect,
  resumeDocumentIndexing
);


// =========================
// Get chunks of a document
// =========================

router.get(
  "/:documentId/chunks",
  protect,
  getDocumentChunks
);


module.exports = router;