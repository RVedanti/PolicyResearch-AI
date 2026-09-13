const express = require("express");

const {
  uploadDocument,
  getProjectDocuments,
  getDocumentChunks,
  resumeDocumentIndexing,
  deleteDocument,
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

router.delete(
  "/:documentId",
  protect,
  deleteDocument
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