const express = require("express");
const {
  createCategory,
  bulkCreateCategories,
  getCategories,
  uploadCategoryImage,
  deleteCategory,
} = require('../controllers/category.controller');
const { authenticateToken, authorize } = require("../middlewares/authMiddleware");
console.log({ createCategory, getCategories }); // Check if functions are defined

const router = express.Router();

router.post(
  '/',
  authenticateToken,
  authorize('Admin'),
  uploadCategoryImage, // Add image upload middleware
  createCategory,
);
router.post(
  '/bulk-import',
  authenticateToken,
  authorize('Admin'),
  bulkCreateCategories,
);

router.get("/", authenticateToken, getCategories); // Authenticated users can view categories
router.delete("/:id", authenticateToken, authorize("Admin"), deleteCategory); // Only admin can delete categories


module.exports = router;
