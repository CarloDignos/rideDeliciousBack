const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Product name is required"] },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    price: { type: Number, required: [true, "Product price is required"] },
    markUp: { type: Number, required: [true, "Markup percentage is required"] },
    sellingPrice: { type: Number, required: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category ID is required"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator ID is required"],
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    history: [
      {
        updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
        changes: { type: Object },
      },
    ],
  },
  { timestamps: true }
);


module.exports = mongoose.model("Product", productSchema);
