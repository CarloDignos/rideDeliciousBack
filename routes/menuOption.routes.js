const express = require('express');
const {
  createMenuOption,
  bulkCreateMenuOptions,
  getMenuOptionsByProduct,
  updateMenuOption,
  deleteMenuOption,
} = require('../controllers/menuOption.controller');
const {
  authenticateToken,
  authorize,
} = require('../middlewares/authMiddleware');

const router = express.Router();

// Route to create a new menu option
router.post('/', createMenuOption);
router.post(
  '/bulk-import',
  authenticateToken,
  authorize('Admin'),
  bulkCreateMenuOptions,
);
// Route to get menu options for a specific product
// Route to get menu options for a specific product
router.get('/:productId', getMenuOptionsByProduct);


// Route to update a menu option
router.put('/:id', updateMenuOption);

// Route to delete a menu option
router.delete('/:id', deleteMenuOption);

module.exports = router;
