const categoryDAL = require("../DAL/category.dal");
const Category = require("../models/category.model"); // Import Product model
const Product = require("../models/product.model"); // Import Product model
const axios = require("axios");
require("dotenv").config();
const multer = require("multer");
const path = require("path");

// Set up multer storage for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/categories/"); // Destination folder for images
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

// Filter image file types
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Configure Multer
const upload = multer({ storage, fileFilter });

exports.uploadCategoryImage = upload.single("image"); // Middleware to handle single image upload


// Create a category with a Google Maps-formatted address
exports.createCategory = async (req, res) => {
  try {
    let { name, description, address } = req.body;
    let imageUrl = req.file ? `/uploads/categories/${req.file.filename}` : null; // Save image path

    if (!address.latitude || !address.longitude) {
      // Fetch latitude and longitude from Google Maps API
      const geocodeResponse = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            address: `${address.street}, ${address.city}, ${address.state}, ${address.zipCode}`,
            key: process.env.GOOGLE_MAPS_API_KEY,
            region: 'PH', // Limit results to the Philippines
          },
        },
      );

      if (geocodeResponse.data.status === 'OK') {
        const result = geocodeResponse.data.results[0];
        const location = result.geometry.location;

        // Parse Google's formatted address components
        const formattedAddress = {
          formattedAddress: result.formatted_address,
          street: getAddressComponent(result, 'route'),
          city: getAddressComponent(result, 'locality'),
          state: getAddressComponent(result, 'administrative_area_level_1'),
          zipCode: getAddressComponent(result, 'postal_code'),
          latitude: location.lat,
          longitude: location.lng,
        };

        address.latitude = location.lat;
        address.longitude = location.lng;
        address.formatted = formattedAddress.formattedAddress;
        address.street = formattedAddress.street || address.street;
        address.city = formattedAddress.city || address.city;
        address.state = formattedAddress.state || address.state;
        address.zipCode = formattedAddress.zipCode || address.zipCode;
      } else {
        return res.status(400).json({ error: 'Invalid address.' });
      }
    }

    // Save category with image and address
    const categoryData = { name, description, image: imageUrl, address };
    const category = await categoryDAL.createCategory(categoryData);

    res
      .status(201)
      .json({ message: 'Category created successfully', category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.bulkCreateCategories = async (req, res) => {
  try {
    const { categories } = req.body; // Extract categories array from request body

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ message: 'Invalid categories data.' });
    }

    // Validate and prepare categories
    const formattedCategories = categories.map((cat) => ({
      name: cat.name,
      description: cat.description || '',
      address: {
        street: cat.street || '',
        city: cat.city || '',
        state: cat.state || '',
        zipCode: cat.zipCode || '',
        latitude: parseFloat(cat.latitude) || null,
        longitude: parseFloat(cat.longitude) || null,
      },
    }));

    // Bulk insert categories
    const createdCategories = await Category.insertMany(formattedCategories);

    res.status(201).json({
      message: 'Categories imported successfully',
      categories: createdCategories,
    });
  } catch (error) {
    console.error('Error bulk creating categories:', error);
    res
      .status(500)
      .json({ message: 'An error occurred while importing categories.' });
  }
};

// Helper function to extract address components by type
function getAddressComponent(result, type) {
  const component = result.address_components.find((comp) =>
    comp.types.includes(type)
  );
  return component ? component.long_name : null;
}


// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await categoryDAL.getAllCategories();
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Delete a category and its associated products
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Delete associated products before deleting the category
    await Product.deleteMany({ category: id });

    // Delete category from the database
    await Category.findByIdAndDelete(id);

    res.status(200).json({ message: "Category and associated products deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};