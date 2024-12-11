const express = require('express');
const {
  createMenuOption,
  getMenuOptionsByProduct,
  updateMenuOption,
  deleteMenuOption,
} = require('../controllers/menuOption.controller');

const router = express.Router();

// Route to create a new menu option
router.post('/', createMenuOption);

// Route to get menu options for a specific product
// Route to get menu options for a specific product
router.get('/:productId', getMenuOptionsByProduct);


// Route to update a menu option
router.put('/:id', updateMenuOption);

// Route to delete a menu option
router.delete('/:id', deleteMenuOption);

module.exports = router;
