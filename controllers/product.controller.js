const productDAL = require("../DAL/product.dal");
const Product = require("../models/product.model");
// Create a new product with category, markup, and selling price
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, markUp, category, createdBy } = req.body;

    // Validate input fields
    if (!name || !description || !price || !markUp || !category || !createdBy) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Calculate selling price
    const sellingPrice = price + (price * markUp) / 100;
    if (isNaN(sellingPrice)) {
      return res.status(400).json({ message: "Invalid price or markUp" });
    }

    const productData = {
      name,
      description,
      price,
      markUp,
      sellingPrice,
      category,
      createdBy,
    };
    const product = await Product.create(productData);

    res.status(201).json({ message: "Product created successfully", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a product
exports.updateProduct = async (req, res) => {
  const { id: productId } = req.params;
  const updateData = req.body;
  const userId = req.user.id; // Assuming `req.user` contains authenticated user info

  try {
    const updatedProduct = await productDAL.updateProduct(productId, updateData, userId);
    res.status(200).json({ message: "Product updated successfully", updatedProduct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get product details
exports.getProductDetails = async (req, res) => {
  const { id: productId } = req.params;

  try {
    const product = await productDAL.getProductDetails(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Get all products
exports.getProducts = async (req, res) => {
  try {
    const products = await productDAL.getAllProducts();
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await productDAL.getProductsByCategory(category);
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
