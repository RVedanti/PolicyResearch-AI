const express = require("express");

const {
  registerUser,
  loginUser,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/me", protect, async (req, res) => {
  res.json({
    success: true,
    message: "You accessed a protected route",
    userId: req.user.userId,
  });
});

module.exports = router;