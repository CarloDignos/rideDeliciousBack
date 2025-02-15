const Order = require("../models/order.model");

// Create an order
exports.createOrder = async (orderData) => {
  const order = new Order(orderData);
  return await order.save();
};

// Get all pending orders
exports.getPendingOrders = async () => {
  return await Order.find({ 'deliveryDetails.status': 'pending' })
    .populate('customer', 'username')
    .populate('store', 'name latitude longitude')
    .populate('products.product', 'name image price')
    .populate('products.menuOptions', 'optionName priceModifier');
};

exports.getPendingOrders = async (req, res) => {
  try {
    const pendingOrders = await orderDAL.getPendingOrders();
    if (!pendingOrders || pendingOrders.length === 0) {
      return res.status(404).json({ message: 'No pending orders found' });
    }
    res.status(200).json(pendingOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get an order by ID
exports.getOrderById = async (orderId) => {
  return await Order.findById(orderId)
    .populate('customer', 'username contactNumber')
    .populate('store', 'name')
    .populate('products.product', 'name image price')
    .populate('products.menuOptions', 'optionName priceModifier'); // Include menu options
};

exports.getAllOrders = async () => {
  return await Order.find()
    .populate('customer', 'username contactNumber')
    .populate('store', 'name')
    .populate('products.product', 'name image price')
    .populate('products.menuOptions', 'optionName priceModifier'); // Include menu options
};

// Get all orders by a specific user ID
exports.getOrdersByUserId = async (userId) => {
  return await Order.find({ customer: userId })
    .populate('customer', 'username contactNumber')
    .populate('store', 'name')
    .populate('products.product', 'name price image')
    .populate('paymentMethod', 'method')
    .populate('products.menuOptions', 'optionName priceModifier')
    .select('totalAmount grandTotalAmount deliveryDetails'); // Include grandTotalAmount in the selection
};

// Update an order
exports.updateOrder = async (orderId, updateData) => {
  // Use dot notation to update the nested field
  if (updateData.status) {
    updateData = { 'deliveryDetails.status': updateData.status };
  }

  return await Order.findByIdAndUpdate(
    orderId,
    { $set: updateData },
    { new: true },
  );
};



// Delete an order
exports.deleteOrder = async (orderId) => {
  return await Order.findByIdAndDelete(orderId);
};
