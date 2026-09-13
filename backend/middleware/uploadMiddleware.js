const multer = require("multer");
const path = require("path");
const fs = require("fs");

// =========================
// Upload Directory
// =========================

const uploadDir = path.join(
  __dirname,
  "..",
  "uploads"
);

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

// =========================
// Storage
// =========================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      `${Date.now()}-${file.originalname}`;

    cb(null, uniqueName);
  },
});

// =========================
// File Filter
// =========================

const fileFilter = (req, file, cb) => {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (extension === ".pdf") {
    cb(null, true);
  } else {
    cb(
      new Error("Only PDF files are allowed")
    );
  }
};

// =========================
// Multer
// =========================

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = upload;