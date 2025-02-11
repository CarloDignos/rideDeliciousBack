const mongoose = require('mongoose');
const menuOptionDAL = require('../DAL/menuOption.dal');
const MenuOption = require('../models/menuOption.model'); // Adjust the path if needed

/**
 * Create a new menu option or multiple menu options
 */
exports.createMenuOption = async (req, res) => {
  try {
    if (Array.isArray(req.body)) {
      // Handle multiple menu options
      const menuOptions = req.body.map((option) => ({
        product: option.product,
        groupName: option.groupName,
        optionName: option.optionName,
        priceModifier: parseFloat(option.priceModifier) || 0,
        isRequired: option.isRequired === 'true' || option.isRequired === true,
        selectionType: option.selectionType || 'single',
      }));

      const createdOptions = await MenuOption.insertMany(menuOptions);
      return res.status(201).json({
        message: 'Menu options created successfully',
        menuOptions: createdOptions,
      });
    } else {
      // Handle a single menu option
      const {
        product,
        groupName,
        optionName,
        priceModifier,
        isRequired,
        selectionType,
      } = req.body;

      const menuOption = new MenuOption({
        product,
        groupName,
        optionName,
        priceModifier: parseFloat(priceModifier) || 0,
        isRequired: isRequired === 'true' || isRequired === true,
        selectionType: selectionType || 'single',
      });

      const createdOption = await menuOption.save();
      return res.status(201).json({
        message: 'Menu option created successfully',
        menuOption: createdOption,
      });
    }
  } catch (error) {
    console.error('Error creating menu option(s):', error);
    res
      .status(500)
      .json({ error: 'An error occurred while creating menu options.' });
  }
};

/**
 * Bulk create menu options
 */
exports.bulkCreateMenuOptions = async (req, res) => {
  try {
    const { menuOptions } = req.body;

    if (!Array.isArray(menuOptions) || menuOptions.length === 0) {
      return res.status(400).json({ message: 'Invalid menu options data.' });
    }

    const formattedOptions = menuOptions.map((option) => ({
      product: option.product,
      groupName: option.groupName,
      optionName: option.optionName,
      priceModifier: parseFloat(option.priceModifier) || 0,
      isRequired: option.isRequired === 'true' || option.isRequired === true,
      selectionType: option.selectionType || 'single',
    }));

    const createdOptions = await MenuOption.insertMany(formattedOptions);

    res.status(201).json({
      message: 'Menu options imported successfully',
      menuOptions: createdOptions,
    });
  } catch (error) {
    console.error('Error bulk creating menu options:', error);
    res
      .status(500)
      .json({ message: 'An error occurred while importing menu options.' });
  }
};

/**
 * Get menu options by product ID
 */
exports.getMenuOptionsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate and convert productId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid product ID format.' });
    }

    // Query menu options and populate the 'product' field with name, price, description
    const menuOptions = await MenuOption.find({
      product: new mongoose.Types.ObjectId(productId),
    }).populate('product', 'name price description');

    // Check if menu options were found
    if (!menuOptions || menuOptions.length === 0) {
      return res
        .status(404)
        .json({ message: 'No menu options found for this product.' });
    }

    // Group the options by groupName for better structure in the response
    const groupedOptions = menuOptions.reduce((groups, option) => {
      if (!groups[option.groupName]) {
        groups[option.groupName] = [];
      }
      groups[option.groupName].push(option);
      return groups;
    }, {});

    // Format the response
    const formattedOptions = Object.keys(groupedOptions).map((groupName) => ({
      groupName,
      options: groupedOptions[groupName],
    }));

    // Return the formatted response
    res.status(200).json(formattedOptions);
  } catch (error) {
    console.error('Error fetching menu options:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching menu options.' });
  }
};

/**
 * Update a menu option by ID
 */
exports.updateMenuOption = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const menuOption = await menuOptionDAL.updateMenuOption(id, updateData);

    if (!menuOption) {
      return res.status(404).json({ message: 'Menu option not found' });
    }

    res
      .status(200)
      .json({ message: 'Menu option updated successfully', menuOption });
  } catch (error) {
    console.error('Error updating menu option:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while updating the menu option.' });
  }
};

/**
 * Delete a menu option by ID
 */
exports.deleteMenuOption = async (req, res) => {
  try {
    const { id } = req.params;

    const menuOption = await menuOptionDAL.deleteMenuOption(id);

    if (!menuOption) {
      return res.status(404).json({ message: 'Menu option not found' });
    }

    res.status(200).json({ message: 'Menu option deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu option:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while deleting the menu option.' });
  }
};
