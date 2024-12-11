const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category', // Assuming 'Category' represents the store
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
        menuOptions: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MenuOption', // Links to specific menu options
          },
        ],
      },
    ],
    totalAmount: { type: Number, required: true },
    deliveryDetails: {
      status: {
        type: String,
        enum: ['pending', 'dispatched', 'delivered', 'cancelled'],
        default: 'pending',
      },
      route: {
        storeCoordinates: {
          latitude: { type: Number, required: true },
          longitude: { type: Number, required: true },
        },
        customerCoordinates: {
          latitude: { type: Number, required: true },
          longitude: { type: Number, required: true },
        },
        distance: { type: Number, required: false }, // In kilometers
        estimatedTime: { type: Number, required: false }, // In minutes
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    history: [
      {
        updater: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        changes: { type: Object },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model('Order', orderSchema);
