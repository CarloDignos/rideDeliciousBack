const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  cartId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', required: true },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: { type: Number, required: true, min: 1 },
  menuOptions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuOption', // Links specific menu options
    },
  ],
});

module.exports = mongoose.model('CartItem', cartItemSchema);
