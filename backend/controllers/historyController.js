const History = require("../models/History");


// =========================
// Get User History
// =========================

const getHistory = async (req, res) => {
  try {
    const history = await History.find({
      user: req.user.userId,
    })
      .populate("project", "title")
      .populate("document", "originalName")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      history,
    });

  } catch (error) {
    console.error(
      "Get history error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to retrieve history",
    });
  }
};


// =========================
// Delete History Item
// =========================

const deleteHistory = async (req, res) => {
  try {
    const { historyId } = req.params;

    const history = await History.findOne({
      _id: historyId,
      user: req.user.userId,
    });

    if (!history) {
      return res.status(404).json({
        success: false,
        message: "History item not found",
      });
    }

    await History.deleteOne({
      _id: historyId,
    });

    res.json({
      success: true,
      message: "History item deleted successfully",
    });

  } catch (error) {
    console.error(
      "Delete history error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to delete history item",
    });
  }
};


module.exports = {
  getHistory,
  deleteHistory,
};