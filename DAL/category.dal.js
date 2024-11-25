const Category = require("../models/category.model");

// Create a new category
exports.createCategory = async (categoryData) => {
  const category = new Category(categoryData);
  return category.save();
};

// Get all categories
exports.getAllCategories = async () => {
  return Category.find();
};

// Get a category by ID
exports.getCategoryById = async (id) => {
  return Category.findById(id);
};
