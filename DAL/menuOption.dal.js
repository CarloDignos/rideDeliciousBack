const MenuOption = require('../models/menuOption.model');

// Create a new menu option
exports.createMenuOption = async (menuOptionData) => {
  const menuOption = new MenuOption(menuOptionData);
  return menuOption.save();
};

// Get menu options for a specific product
exports.getMenuOptionsByProduct = async (productId) => {
  return MenuOption.find({ product: productId });
};

// Update a menu option
exports.updateMenuOption = async (id, updateData) => {
  return MenuOption.findByIdAndUpdate(id, updateData, { new: true });
};

exports.getMenuOptionsByIds = async (menuOptionIds) => {
  return MenuOption.find({ _id: { $in: menuOptionIds } });
};

// Delete a menu option
exports.deleteMenuOption = async (id) => {
  return MenuOption.findByIdAndDelete(id);
};
