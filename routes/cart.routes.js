const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const cartController = require('../controllers/cartController');

const router = express.Router();

router.get('/', authenticateToken, cartController.getCart);
router.post('/add', authenticateToken, cartController.addItemToCart);
router.delete('/remove/:cartItemId', authenticateToken, cartController.removeItemFromCart);
router.delete('/clear', authenticateToken, cartController.clearCart);

module.exports = router;
