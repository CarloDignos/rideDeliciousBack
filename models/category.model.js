const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
    image: { type: String, required: false },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      latitude: { type: Number, required: false }, // Added latitude
      longitude: { type: Number, required: false }, // Added longitude
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
