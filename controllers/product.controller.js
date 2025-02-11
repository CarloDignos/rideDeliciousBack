const mongoose = require("mongoose"); // Add this line if it's missing
const Product = require("../models/product.model");
const productDAL = require("../DAL/product.dal");

// Create a new product with category, markup, and selling price
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, markUp, category, createdBy } = req.body;
    console.log(req.file); // Debugging: Check if the file is uploaded
    const image = req.file ? `uploads/${req.file.filename}` : null;

    // Convert price and markUp to numbers
    const priceNum = Number(price);
    const markUpNum = Number(markUp);

    // Validate required fields
    if (
      !name ||
      !description ||
      isNaN(priceNum) ||
      isNaN(markUpNum) ||
      !category ||
      !createdBy
    ) {
      return res
        .status(400)
        .json({ message: 'All fields are required and must be valid numbers' });
    }

    // Ensure price is a positive number
    if (priceNum <= 0) {
      return res
        .status(400)
        .json({ message: 'Price must be greater than zero' });
    }

    // Check if markUp is a percentage (e.g., 12) or a decimal (e.g., 0.12)
    const sellingPrice =
      markUpNum < 1
        ? priceNum + priceNum * markUpNum // If markUp is a decimal (0.12 for 12%)
        : priceNum + priceNum * (markUpNum / 100); // If markUp is a percentage (12 for 12%)

    // Prepare product data
    const productData = {
      name,
      description,
      price: priceNum,
      markUp: markUpNum,
      sellingPrice: Number(sellingPrice.toFixed(2)), // Round to 2 decimal places
      category,
      createdBy,
      image, // Save image path in correct format
    };

    // Create and save product
    const product = await Product.create(productData);

    res.status(201).json({ message: 'Product created successfully', product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.bulkCreateProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Invalid products data.' });
    }

    const processedProducts = [];
    const errors = [];

    for (const [index, prod] of products.entries()) {
      try {
        const { name, description, price, markUp, category, createdBy, image } =
          prod;

        // Convert price and markUp to numbers
        const priceNum = Number(price);
        const markUpNum = Number(markUp);

        // Validate required fields
        if (
          !name ||
          !description ||
          isNaN(priceNum) ||
          isNaN(markUpNum) ||
          !category ||
          !createdBy
        ) {
          throw new Error(
            `Product at index ${index} is missing required fields or contains invalid data.`,
          );
        }

        // Ensure price is a positive number
        if (priceNum <= 0) {
          throw new Error(
            `Product at index ${index} has a price less than or equal to zero.`,
          );
        }

        // Calculate selling price
        const sellingPrice =
          markUpNum < 1
            ? priceNum + priceNum * markUpNum // If markUp is a decimal (0.12 for 12%)
            : priceNum + priceNum * (markUpNum / 100); // If markUp is a percentage (12 for 12%)

        // Prepare product data
        const productData = {
          name,
          description,
          price: priceNum,
          markUp: markUpNum,
          sellingPrice: Number(sellingPrice.toFixed(2)), // Round to 2 decimal places
          category,
          createdBy,
          image: image || '', // Use provided image or empty string
        };

        processedProducts.push(productData);
      } catch (error) {
        errors.push({ index, message: error.message });
      }
    }

    if (processedProducts.length === 0) {
      return res
        .status(400)
        .json({ message: 'No valid products to import.', errors });
    }

    // Bulk insert valid products
    const createdProducts = await Product.insertMany(processedProducts);

    res.status(201).json({
      message: `${createdProducts.length} products imported successfully.`,
      createdProducts,
      errors,
    });
  } catch (error) {
    console.error('Error bulk creating products:', error);
    res
      .status(500)
      .json({ message: 'An error occurred while importing products.' });
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
    const products = await Product.find()
      .populate({
        path: "category",
        select: "name address image",
      }) // Include the `address` and `name` fields explicitly in the category
      .populate("createdBy", "_id username userType"); // Populate `createdBy` details

    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    let { category } = req.params;

    console.log('req.params:', req.params); // Debugging log
    if (!category) {
      console.log('Category parameter is missing');
      return res.status(400).json({ error: 'Category parameter is required' });
    }

    category = category.trim();

    if (!mongoose.Types.ObjectId.isValid(category)) {
      console.log('Invalid Category ID:', category);
      return res.status(400).json({ error: 'Invalid category ID format' });
    }

    const categoryId = mongoose.Types.ObjectId(category);

    const products = await Product.find({ category: categoryId })
      .populate('category', 'name address image')
      .populate('createdBy', 'username userType');

    if (products.length === 0) {
      return res
        .status(404)
        .json({ message: 'No products found for this category' });
    }

    res.status(200).json(products);
  } catch (err) {
    console.error('Error fetching products by category:', err);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching products' });
  }
};


exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete product from database
    await Product.findByIdAndDelete(id);

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
