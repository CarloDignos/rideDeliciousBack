const express = require("express");
const {
  createProduct,
  bulkCreateProducts,
  getProducts,
  getProductsByCategory,
  updateProduct,
  getProductDetails,
  deleteProduct,
} = require('../controllers/product.controller');
const { authenticateToken, authorize } = require("../middlewares/authMiddleware");
const multer = require("multer");
const fs = require("fs");
const path = require("path");


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../uploads"); // Correct relative path
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});


const upload = multer({ storage: storage });

const router = express.Router();

router.post("/", authenticateToken, authorize("Admin"), upload.single("image"), createProduct);
router.post(
  '/bulk-import',
  authenticateToken,
  authorize('Admin'),
  bulkCreateProducts,
);
router.get("/", authenticateToken, getProducts); // Authenticated users can view products
router.get("/category/:category", authenticateToken, getProductsByCategory); // Authenticated users can view products by category
router.put("/:id", authenticateToken, authorize("Admin"), updateProduct); // Only admin can update products
router.get("/:id", authenticateToken, getProductDetails); // Authenticated users can view product details
router.delete("/:id", authenticateToken, authorize("Admin"), deleteProduct); // Only admin can delete products

module.exports = router;
