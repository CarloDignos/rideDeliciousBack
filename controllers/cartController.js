const cartDal = require('../DAL/cartDal');
const CartItem = require('../models/cartItem.model');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');

const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    let cart = await cartDal.getCartByUserId(userId);

    if (!cart) {
      cart = await cartDal.createCart(userId);
    }

    res.json(cart);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Failed to fetch cart', error: error.message });
  }
};

const addItemToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity, menuOptions } = req.body;

    let cart = await cartDal.getCartByUserId(userId);
    if (!cart) {
      cart = await cartDal.createCart(userId);
    }

    // If the cart already contains items, enforce the same store rule.
    if (cart.cartItems && cart.cartItems.length > 0) {
      // Retrieve the store of the existing items (assuming products are populated)
      const existingStore = cart.cartItems[0].productId.store;

      // Fetch the new product's store information
      const newProduct = await Product.findById(productId).select('category');
      if (!newProduct) {
        return res.status(404).json({ message: 'Product not found.' });
      }

      // Compare the store IDs (make sure to convert them to strings if needed)
      if (existingStore.toString() !== newProduct.store.toString()) {
        return res.status(400).json({
          message: 'You can only add products from the same store to the cart.',
        });
      }
    }

    // If the check passes, add the item
    const cartItem = await cartDal.addCartItem(
      cart._id,
      productId,
      quantity,
      menuOptions,
    );
    res.status(200).json(cartItem);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to add item to cart',
      error: error.message,
    });
  }
};

const removeItemFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params; // Ensure cartItemId is passed correctly

    const cart = await cartDal.getCartByUserId(userId);
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Delete the cart item by cartItemId
    const deletedItem = await CartItem.findByIdAndDelete(cartItemId);
    if (!deletedItem) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    // Update the cart to remove the reference
    await Cart.updateOne(
      { _id: cart._id },
      { $pull: { cartItems: cartItemId } },
    );

    res.status(200).json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error in removeItemFromCart:', error);
    res.status(500).json({
      message: 'Failed to remove item from cart',
      error: error.message,
    });
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await cartDal.getCartByUserId(userId);
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    await cartDal.clearCart(cart._id);
    res.status(200).json({ message: 'Cart cleared' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Failed to clear cart', error: error.message });
  }
};

module.exports = { getCart, addItemToCart, removeItemFromCart, clearCart };
