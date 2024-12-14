const express = require('express');
const {
  createPaymentMethod,
  getPaymentMethods,
  getAvailablePaymentMethods,
 
} = require('../controllers/paymentMethod.controller');
const {
  authenticateToken,
  authorize,
} = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authenticateToken, authorize('Admin'), createPaymentMethod);
router.get('/', authenticateToken, authorize('Admin'), getPaymentMethods);
router.get('/available', getAvailablePaymentMethods);

module.exports = router;
