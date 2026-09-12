const express = require("express");

const {
  getHistory,
  deleteHistory,
} = require("../controllers/historyController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();


// Get current user's history
router.get(
  "/",
  protect,
  getHistory
);


// Delete history item
router.delete(
  "/:historyId",
  protect,
  deleteHistory
);


module.exports = router;