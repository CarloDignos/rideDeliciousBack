const axios = require("axios");
const orderDAL = require("../DAL/order.dal");
const User = require("../models/User");
const Category = require("../models/category.model");

exports.createOrder = async (req, res) => {
  const { customer, store, products, createdBy } = req.body;

  try {
    // Validate products
    if (!Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ message: "Products must be a non-empty array." });
    }

    const invalidProducts = products.filter(
      (p) => typeof p.quantity !== "number" || typeof p.price !== "number"
    );

    if (invalidProducts.length > 0) {
      return res.status(400).json({
        message: "Each product must have a valid 'quantity' and 'price'.",
        invalidProducts,
      });
    }

    const storeDetails = await Category.findById(store);
    const customerDetails = await User.findById(customer);

    if (!storeDetails || !customerDetails) {
      return res.status(404).json({ message: "Store or customer not found" });
    }

    const { latitude: storeLat, longitude: storeLng } = storeDetails.address;
    const { latitude: customerLat, longitude: customerLng } =
      customerDetails.address;

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/distancematrix/json",
      {
        params: {
          origins: `${storeLat},${storeLng}`,
          destinations: `${customerLat},${customerLng}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );

    const data = response.data;

    if (!data || data.status !== "OK") {
      return res.status(400).json({
        message: data.error_message || "Failed to calculate distance and time",
      });
    }

    const distance = data.rows[0].elements[0].distance.value / 1000; // km
    const estimatedTime = data.rows[0].elements[0].duration.value / 60; // minutes

    // Calculate total amount
    const totalAmount = products.reduce((sum, p) => {
      const quantity = p.quantity || 0;
      const price = p.price || 0;
      return sum + quantity * price;
    }, 0);

    // Prepare order data
    const orderData = {
      customer,
      store,
      products,
      totalAmount,
      deliveryDetails: {
        route: {
          storeCoordinates: { latitude: storeLat, longitude: storeLng },
          customerCoordinates: {
            latitude: customerLat,
            longitude: customerLng,
          },
          distance,
          estimatedTime,
        },
      },
      createdBy,
    };

    const newOrder = await orderDAL.createOrder(orderData);
    res
      .status(201)
      .json({ message: "Order created successfully", order: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// Other CRUD operations
exports.getOrderById = async (req, res) => {
  try {
    const order = await orderDAL.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await orderDAL.getAllOrders();
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const updatedOrder = await orderDAL.updateOrder(req.params.id, req.body);
    if (!updatedOrder)
      return res.status(404).json({ message: "Order not found" });
    res
      .status(200)
      .json({ message: "Order updated successfully", order: updatedOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await orderDAL.deleteOrder(req.params.id);
    if (!deletedOrder)
      return res.status(404).json({ message: "Order not found" });
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRoute = async (req, res) => {
  const { id: orderId } = req.params;

  try {
    // Fetch order details
    const order = await orderDAL.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Get store and customer coordinates
    const storeDetails = await Category.findById(order.store);
    const customerDetails = await User.findById(order.customer);

    if (!storeDetails || !customerDetails) {
      return res.status(404).json({ message: "Store or customer not found" });
    }

    const { latitude: storeLat, longitude: storeLng } = storeDetails.address;
    const { latitude: customerLat, longitude: customerLng } =
      customerDetails.address;

    // Fetch the route using Google Maps Directions API
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin: `${storeLat},${storeLng}`,
          destination: `${customerLat},${customerLng}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
          mode: "driving", // Specify travel mode (driving, walking, etc.)
        },
      }
    );

    const data = response.data;

    if (data.status !== "OK") {
      return res
        .status(400)
        .json({ message: `Failed to fetch route: ${data.status}` });
    }

    // Extract route details
    const route = data.routes[0];
    const distance = route.legs[0].distance.text; // e.g., "15.2 km"
    const duration = route.legs[0].duration.text; // e.g., "22 mins"
    const polyline = route.overview_polyline.points; // Encoded polyline for map rendering

    res.status(200).json({
      message: "Route fetched successfully",
      route: {
        distance,
        duration,
        polyline,
        startLocation: route.legs[0].start_location,
        endLocation: route.legs[0].end_location,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.acceptOrder = async (req, res) => {
  const { id: orderId } = req.params; // Order ID from route
  const riderId = req.user.id; // Rider's ID from authenticated user

  try {
    // Check if the user is a rider
    if (req.user.userType !== "rider") {
      return res.status(403).json({ message: "Only riders can accept orders" });
    }

    // Assign the order to the rider
    const updatedOrder = await orderDAL.assignRiderToOrder(orderId, riderId);
    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({
      message: "Order accepted successfully",
      order: updatedOrder,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
