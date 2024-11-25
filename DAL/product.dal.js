const Product = require("../models/product.model");

// Create a new product
exports.createProduct = async (productData) => {
  const existingProduct = await Product.findOne({
    name: productData.name,
    price: productData.price,
    category: productData.category,
  });

  if (existingProduct) {
    throw new Error("Product with the same name, price, and category already exists.");
  }

  // Calculate selling price
  const sellingPrice = productData.price + (productData.price * productData.markUp) / 100;
  productData.sellingPrice = sellingPrice;

  const product = new Product(productData);
  return product.save();
};

// Update a product with history tracking
exports.updateProduct = async (productId, updateData, userId) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  const originalData = product.toObject();
  const changes = {};

  // Compare changes
  for (let key in updateData) {
    if (updateData[key] !== originalData[key]) {
      changes[key] = { from: originalData[key], to: updateData[key] };
    }
  }

  // Update fields
  product.set(updateData);
  product.updatedBy = userId;

  // Add to history
  product.history.push({
    updater: userId,
    changes,
  });

  return await product.save();
};

// Get product details with metadata
exports.getProductDetails = async (productId) => {
  return Product.findById(productId)
    .populate("createdBy", "username")
    .populate("updatedBy", "username")
    .populate("history.updater", "username");
};
// Get all products
exports.getAllProducts = async () => {
  return Product.find().populate("category").populate("createdBy", "username userType");
};

// Get products by category
exports.getProductsByCategory = async (categoryId) => {
  return Product.find({ category: categoryId }).populate("category").populate("createdBy", "username userType");
};