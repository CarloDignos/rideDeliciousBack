const express = require("express");
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  acceptOrder,
  getRoute,
} = require("../controllers/order.controller");
const { authenticateToken, authorize } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", authenticateToken, authorize("Customer"), createOrder); // Customers can create orders
router.get("/", authenticateToken, authorize("Admin"), getOrders); // Admins can view all orders
router.get("/:id", authenticateToken, getOrderById); // Authenticated users can view an order by ID
router.put("/:id", authenticateToken, authorize("Customer"), updateOrder); // Customers can update their orders
router.delete('/:id', authenticateToken, authorize('Customer'), deleteOrder); // Customers can delete their orders
router.put("/:id/accept", authenticateToken, authorize("Rider"), acceptOrder); // Rider accepts the order
router.get("/:id/route", authenticateToken, getRoute); // Customer and Rider can view the route


module.exports = router;
