const menuOptionDAL = require('../DAL/menuOption.dal');
const MenuOption = require('../models/menuOption.model'); // Adjust the path if needed

// Create a new menu option
// Create a new menu option
exports.createMenuOption = async (req, res) => {
  try {
    // Check if the request body is an array or a single object
    const isArray = Array.isArray(req.body);

    if (isArray) {
      // Handle multiple menu options
      const menuOptions = req.body.map((option) => ({
        product: option.product,
        groupName: option.groupName,
        optionName: option.optionName,
        priceModifier: option.priceModifier,
        isRequired: option.isRequired,
        selectionType: option.selectionType,
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
        priceModifier,
        isRequired,
        selectionType,
      });

      const createdOption = await menuOption.save();
      return res.status(201).json({
        message: 'Menu option created successfully',
        menuOption: createdOption,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
      isRequired: option.isRequired === 'true',
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

// Get menu options for a specific product
exports.getMenuOptionsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const menuOptions = await MenuOption.find({ product: productId });

    // Group options by "groupName"
    const groupedOptions = menuOptions.reduce((groups, option) => {
      if (!groups[option.groupName]) {
        groups[option.groupName] = [];
      }
      groups[option.groupName].push(option);
      return groups;
    }, {});

    res.status(200).json(groupedOptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Update a menu option
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
    res.status(500).json({ error: error.message });
  }
};

// Delete a menu option
exports.deleteMenuOption = async (req, res) => {
  try {
    const { id } = req.params;

    const menuOption = await menuOptionDAL.deleteMenuOption(id);

    if (!menuOption) {
      return res.status(404).json({ message: 'Menu option not found' });
    }

    res.status(200).json({ message: 'Menu option deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
