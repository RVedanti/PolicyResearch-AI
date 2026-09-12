const express = require("express");

const {
  askQuestion,
} = require("../controllers/ragController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/ask",
  protect,
  askQuestion
);

module.exports = router;