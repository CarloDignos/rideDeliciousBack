const express = require("express");
const {
  createProduct,
  getProducts,
  getProductsByCategory,
  updateProduct,
  getProductDetails,
} = require("../controllers/product.controller");
const { authenticateToken, authorize } = require("../middlewares/authMiddleware");


const router = express.Router();

router.post("/", authenticateToken, authorize("admin"), createProduct); // Only admin can create products
router.get("/", authenticateToken, getProducts); // Authenticated users can view products
router.get("/category/:category", authenticateToken, getProductsByCategory); // Authenticated users can view products by category
router.put("/:id", authenticateToken, authorize("admin"), updateProduct); // Only admin can update products
router.get("/:id", authenticateToken, getProductDetails); // Authenticated users can view product details

module.exports = router;
