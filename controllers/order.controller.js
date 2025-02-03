const axios = require('axios');
const orderDAL = require('../DAL/order.dal');
const User = require('../models/User');
const Category = require('../models/category.model');
const Product = require('../models/product.model');
const PaymentMethod = require('../models/paymentMethod.model');
const menuOptionDAL = require('../DAL/menuOption.dal');
const Order = require('../models/order.model');


exports.acceptOrder = async (req, res) => {
  const { id: orderId } = req.params; // Order ID from route
  const riderId = req.user.id; // Rider's ID from authenticated user

  try {
    // Validate user type
    if (!req.user || req.user.userType !== 'Rider') {
      return res.status(403).json({ message: 'Only riders can accept orders' });
    }

    // Update the order status and assign the rider
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        'deliveryDetails.status': 'dispatched',
        updatedBy: riderId, // Track who updated it
      },
      { new: true },
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({
      message: 'Order accepted successfully',
      order: updatedOrder,
    });
  } catch (err) {
    console.error('Error in acceptOrder:', err);
    res.status(500).json({ error: err.message });
  }
};




exports.getPendingOrders = async (req, res) => {
  try {
    const pendingOrders = await Order.find({
      'deliveryDetails.status': 'pending',
    })
      .populate('customer', 'username')
      .populate('store', 'name')
      .populate('paymentMethod', 'type')
      .populate('products.product', 'name image price')
      .populate('products.menuOptions', 'optionName priceModifier');

    console.log('Pending orders fetched:', pendingOrders);

    if (!pendingOrders || pendingOrders.length === 0) {
      return res.status(404).json({ message: 'No pending orders found' });
    }

    // Send JSON response
    res.status(200).json(pendingOrders);
  } catch (err) {
    console.error('Error in getPendingOrders:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.createOrder = async (req, res) => {
  const { customer, store, products, createdBy, paymentMethodId, distance } =
    req.body;
  console.log('Request received:', JSON.stringify(req.body, null, 2));

  // Validate the distance
  if (typeof distance !== 'number' || distance < 0) {
    return res.status(400).json({ message: 'Invalid distance provided.' });
  }
  try {
    // Validate products
    if (!Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ message: 'Products must be a non-empty array.' });
    }

    const paymentMethod = await PaymentMethod.findById(paymentMethodId);
    if (!paymentMethod) {
      return res
        .status(404)
        .json({ message: 'Selected payment method not found' });
    }

    // Fetch product and menu option details for price calculation
    const productDetails = await Promise.all(
      products.map(async (item) => {
        const product = await Product.findById(item.product);
        if (!product) {
          throw new Error(`Product with ID ${item.product} not found.`);
        }

        // Fetch and validate menu options
        const menuOptions = await menuOptionDAL.getMenuOptionsByIds(
          item.menuOptions || [],
        );

        // Ensure all menu options belong to the same product
        const invalidOptions = menuOptions.filter(
          (option) => option.product.toString() !== item.product,
        );

        if (invalidOptions.length > 0) {
          throw new Error(
            `Invalid menu options for product ${
              item.product
            }: ${invalidOptions.map((opt) => opt.optionName)}`,
          );
        }

        // Calculate total price including menu options
        const menuOptionPrice = menuOptions.reduce(
          (sum, opt) => sum + opt.priceModifier,
          0,
        );

        return {
          ...item,
          price: product.price + menuOptionPrice, // Final price calculation
        };
      }),
    );

    // Validate products for missing fields
    const invalidProducts = productDetails.filter(
      (p) => typeof p.quantity !== 'number' || typeof p.price !== 'number',
    );
    if (invalidProducts.length > 0) {
      return res.status(400).json({
        message: "Each product must have a valid 'quantity' and 'price'.",
        invalidProducts,
      });
    }

    // Fetch store and customer details
    const storeDetails = await Category.findById(store);
    const customerDetails = await User.findById(customer).populate('address');

    if (!storeDetails || !customerDetails) {
      return res.status(404).json({ message: 'Store or customer not found' });
    }
    if (!customerDetails.address) {
      return res.status(404).json({ message: 'Customer address not found' });
    }

    const { latitude: storeLat, longitude: storeLng } = storeDetails.address;
    const { latitude: customerLat, longitude: customerLng } =
      customerDetails.address;

    console.log('Store Coordinates:', storeLat, storeLng);
    console.log('Customer Coordinates:', customerLat, customerLng);

    // Calculate distance and estimated time using Google Maps API
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/distancematrix/json',
      {
        params: {
          origins: `${storeLat},${storeLng}`,
          destinations: `${customerLat},${customerLng}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    );

    const data = response.data;

    if (
      !data ||
      data.status !== 'OK' ||
      !data.rows[0]?.elements[0]?.distance?.value
    ) {
      return res.status(400).json({
        message: 'Failed to calculate distance and time',
        googleMapsError: data.error_message || 'Invalid API response',
      });
    }

    // Extract distance (in meters) and estimated time (in seconds)
    const distanceInMeters = data.rows[0].elements[0].distance.value;
    const estimatedTime = data.rows[0].elements[0].duration.value / 60; // In minutes

    // Convert distance to kilometers
    const distanceInKm = distanceInMeters / 1000;

    // Function to compute delivery fee
    const computeDeliveryFee = (distance) => {
      if (distance <= 2) {
        return 40; // Minimum fee for distances ≤ 2 km
      }

      const extraDistanceInMeters = (distance - 2) * 1000; // Convert extra distance to meters
      const extraFee = Math.ceil(extraDistanceInMeters / 100); // ₱1 per 100 meters
      return 40 + extraFee; // Total fee
    };
    // Calculate delivery fee
    const deliveryFee = computeDeliveryFee(distance);

    // Log delivery fee for debugging
    console.log('Distance:', distance, 'km');
    console.log('Delivery Fee:', deliveryFee);
    // Calculate total amount (products + delivery fee)
    const totalAmount =
      productDetails.reduce((sum, p) => {
        const quantity = p.quantity || 0;
        const price = p.price || 0;
        return sum + quantity * price;
      }, 0);
    
    const grandTotalAmount = totalAmount + deliveryFee
  console.log('Grand Total Amount:', + grandTotalAmount)
    // Prepare order data
    const orderData = {
      customer,
      store,
      products: productDetails,
      totalAmount,
      grandTotalAmount,
      deliveryDetails: {
        route: {
          storeCoordinates: { latitude: storeLat, longitude: storeLng },
          customerCoordinates: {
            latitude: customerLat,
            longitude: customerLng,
          },
          distance: distanceInKm,
          estimatedTime,
        },
        deliveryFee, // Include delivery fee in delivery details
      },
      paymentMethod: paymentMethod._id,
      createdBy,
    };

    // Create and save the order
    const newOrder = await orderDAL.createOrder(orderData);
    res
      .status(201)
      .json({ message: 'Order created successfully', order: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// Other CRUD operations
exports.getOrderById = async (req, res) => {
  try {
    const order = await orderDAL.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
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

exports.getOrdersByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const orders = await orderDAL.getOrdersByUserId(userId);
    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: 'No orders found for this user' });
    }
    res.status(200).json(orders);
  } catch (err) {
    console.log({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

exports.getOrdersUpdatedByRider = async (req, res) => {
  try {
    const { id: riderIdFromQuery } = req.query; // Rider ID from query params
    const userId = req.user.id; // Admin's or Rider's ID from the token
    const userType = req.user.userType; // Admin or Rider

    let riderId;

    // Admin can fetch any rider's records; Rider can only fetch their own
    if (userType === 'Admin') {
      riderId = riderIdFromQuery || userId; // Use query param or fallback to Admin's ID
    } else if (userType === 'Rider') {
      riderId = userId; // Riders fetch only their own records
    } else {
      return res
        .status(403)
        .json({ message: 'Access denied: Unauthorized role' });
    }

    // Fetch orders updated by the rider
    const orders = await Order.find({ updatedBy: riderId })
      .populate('customer', 'username')
      .populate('store', 'name')
      .populate('products.product', 'name image price')
      .populate('products.menuOptions', 'optionName priceModifier')
      .populate('paymentMethod', 'type')
      .select('totalAmount deliveryDetails createdAt updatedAt');

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ message: 'No orders found for this rider.' });
    }

    res.status(200).json({
      message: 'Orders fetched successfully',
      riderId,
      totalOrders: orders.length,
      orders,
    });
  } catch (err) {
    console.error('Error fetching rider orders:', err);
    res.status(500).json({ error: err.message });
  }
};


exports.updateOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const updateData = req.body;

    // Log the request payload for debugging
    console.log('Request payload:', updateData);

    const updatedOrder = await orderDAL.updateOrder(orderId, updateData);

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Respond with the updated order
    res.status(200).json({
      message: 'Order updated successfully',
      order: updatedOrder,
    });
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await orderDAL.deleteOrder(req.params.id);
    if (!deletedOrder)
      return res.status(404).json({ message: 'Order not found' });
    res.status(200).json({ message: 'Order deleted successfully' });
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
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get store and customer coordinates
    const storeDetails = await Category.findById(order.store);
    const customerDetails = await User.findById(order.customer);

    if (!storeDetails || !customerDetails) {
      return res.status(404).json({ message: 'Store or customer not found' });
    }

    const { latitude: storeLat, longitude: storeLng } = storeDetails.address;
    const { latitude: customerLat, longitude: customerLng } =
      customerDetails.address;

    // Fetch the route using Google Maps Directions API
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/directions/json',
      {
        params: {
          origin: `${storeLat},${storeLng}`,
          destination: `${customerLat},${customerLng}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
          mode: 'driving', // Specify travel mode (driving, walking, etc.)
        },
      },
    );

    const data = response.data;

    if (data.status !== 'OK') {
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
      message: 'Route fetched successfully',
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
