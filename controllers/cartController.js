const cartDal = require('../DAL/cartDal');

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
    const { productId } = req.params;

    const cart = await cartDal.getCartByUserId(userId);
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    await cartDal.removeCartItem(cart._id, productId);
    res.status(200).json({ message: 'Item removed from cart' });
  } catch (error) {
    res
      .status(500)
      .json({
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
