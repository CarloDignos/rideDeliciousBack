const Cart = require('../models/cart.model');
const CartItem = require('../models/cartItem.model');

const getCartByUserId = async (userId) => {
  const cart = await Cart.findOne({ userId });
  if (!cart) return null;

    const cartItems = await CartItem.find({ cartId: cart._id })
      .populate({
        path: 'productId',
        select: '_id name price sellingPrice image category store', // include store
        populate: {
          path: 'category',
          select: 'name latitude longitude',
        },
      })
      .populate('menuOptions', 'optionName priceModifier');


  return { ...cart.toObject(), cartItems };
};

const createCart = async (userId) => {
  const cart = new Cart({ userId, cartItems: [] }); // Add cartItems
  return await cart.save();
};

// Add an item to the cart
const addCartItem = async (cartId, productId, quantity, menuOptions = []) => {
  // Check if an item with the same product and menu options exists
  let cartItem = await CartItem.findOne({
    cartId,
    productId,
    menuOptions: { $all: menuOptions }, // Ensure exact menu options match
  });

  if (cartItem) {
    // Update quantity if item exists
    cartItem.quantity += quantity;
  } else {
    // Create new cart item with menu options
    cartItem = new CartItem({ cartId, productId, quantity, menuOptions });
  }

  return await cartItem.save();
};

const removeCartItem = async (cartId, productId) => {
  return await CartItem.deleteOne({ cartId, productId });
};

const clearCart = async (cartId) => {
  return await CartItem.deleteMany({ cartId });
};

module.exports = {
  getCartByUserId,
  createCart,
  addCartItem,
  removeCartItem,
  clearCart,
};
