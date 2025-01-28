const express = require('express');
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  acceptOrder,
  getRoute,
  getOrdersByUserId,
  getPendingOrders,
  getOrdersUpdatedByRider,
} = require('../controllers/order.controller');
const {
  authenticateToken,
  authorize,
} = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authenticateToken, authorize('Customer'), createOrder); // Customers can create orders
router.put('/:id/accept', authenticateToken, authorize('Rider'), acceptOrder);
router.get(
  '/pending',
  authenticateToken,
  authorize('Rider'), // Allow only Admin or Riders
  getPendingOrders,
);
router.get('/', authenticateToken, authorize('Admin'), getOrders); // Admins can view all orders
router.get(
  '/report',
  authenticateToken,
  authorize('Rider', 'Admin'),
  getOrdersUpdatedByRider,
);
router.get('/:id', authenticateToken, getOrderById); // Authenticated users can view an order by ID
router.get(
  '/user/:userId',
  authenticateToken,
  authorize('Customer', 'Admin'),
  getOrdersByUserId,
);
router.put('/:id', authenticateToken, authorize('Rider'), updateOrder); // Customers can update their orders
router.delete('/:id', authenticateToken, authorize('Customer'), deleteOrder); // Customers can delete their orders
router.get('/:id/route', authenticateToken, getRoute); // Customer and Rider can view the route

module.exports = router;
