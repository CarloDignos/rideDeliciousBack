const express = require("express");
const {
  createCategory,
  getCategories,
} = require("../controllers/category.controller");
const { authenticateToken, authorize } = require("../middlewares/authMiddleware");
console.log({ createCategory, getCategories }); // Check if functions are defined

const router = express.Router();

router.post("/", authenticateToken, authorize("Admin"), createCategory);
router.get("/", authenticateToken, getCategories); // Authenticated users can view categories

module.exports = router;
