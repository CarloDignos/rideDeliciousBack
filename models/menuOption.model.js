const mongoose = require('mongoose');

const menuOptionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    groupName: {
      type: String, // E.g., "Flavor", "Drink", "Add-ons"
      required: true,
    },
    optionName: {
      type: String, // E.g., "Original", "Spicy", "Regular Coke"
      required: true,
    },
    priceModifier: {
      type: Number, // Price adjustment (e.g., 30.00)
      required: true,
      default: 0,
    },
    isRequired: {
      type: Boolean, // Whether this option is mandatory
      required: true,
      default: false,
    },
    selectionType: {
      type: String, // "single" or "multiple"
      enum: ['single', 'multiple'],
      required: true,
      default: 'single',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('MenuOption', menuOptionSchema);
