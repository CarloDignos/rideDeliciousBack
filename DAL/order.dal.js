const Order = require("../models/order.model");

// Create an order
exports.createOrder = async (orderData) => {
  const order = new Order(orderData);
  return await order.save();
};

// Get an order by ID
exports.getOrderById = async (orderId) => {
  return await Order.findById(orderId)
    .populate('customer', 'username')
    .populate('store', 'name')
    .populate('products.product', 'name price')
    .populate('products.menuOptions', 'optionName priceModifier'); // Include menu options
};

exports.getAllOrders = async () => {
  return await Order.find()
    .populate('customer', 'username')
    .populate('store', 'name')
    .populate('products.product', 'name price')
    .populate('products.menuOptions', 'optionName priceModifier'); // Include menu options
};


// Update an order
exports.updateOrder = async (orderId, updateData) => {
  return await Order.findByIdAndUpdate(orderId, updateData, { new: true });
};

// Delete an order
exports.deleteOrder = async (orderId) => {
  return await Order.findByIdAndDelete(orderId);
};
