const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['COD', 'GCash'], // Restrict to COD and GCash only
    required: true,
  },
  gcashDetails: {
    number: { type: String }, // GCash number
    qrCode: { type: String }, // QR Code URL
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
