const express = require("express");

const {
  getSavedAnswers,
  saveAnswer,
  deleteSavedAnswer,
} = require("../controllers/savedController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/",
  protect,
  getSavedAnswers
);

router.post(
  "/",
  protect,
  saveAnswer
);

router.delete(
  "/:savedId",
  protect,
  deleteSavedAnswer
);

module.exports = router;