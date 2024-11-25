const categoryDAL = require("../DAL/category.dal");
const axios = require("axios");
require("dotenv").config();

// Create a category with a Google Maps-formatted address
exports.createCategory = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address.latitude || !address.longitude) {
      // Fetch latitude and longitude from Google Maps API
      const geocodeResponse = await axios.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {
          params: {
            address: `${address.street}, ${address.city}, ${address.state}, ${address.zipCode}`,
            key: process.env.GOOGLE_MAPS_API_KEY,
            region: "PH", // Limit results to the Philippines
          },
        }
      );

      if (geocodeResponse.data.status === "OK") {
        const result = geocodeResponse.data.results[0];
        const location = result.geometry.location;

        // Parse Google's formatted address components
        const formattedAddress = {
          formattedAddress: result.formatted_address, // The full Google-formatted address
          street: getAddressComponent(result, "route"),
          neighborhood: getAddressComponent(result, "sublocality_level_1") || getAddressComponent(result, "neighborhood"),
          city: getAddressComponent(result, "locality"),
          state: getAddressComponent(result, "administrative_area_level_1"),
          zipCode: getAddressComponent(result, "postal_code"),
          latitude: location.lat,
          longitude: location.lng,
        };

        address.latitude = location.lat;
        address.longitude = location.lng;
        address.formatted = formattedAddress.formattedAddress;
        address.street = formattedAddress.street || address.street;
        address.city = formattedAddress.city || address.city;
        address.state = formattedAddress.state || address.state;
        address.zipCode = formattedAddress.zipCode || address.zipCode;
      } else if (geocodeResponse.data.status === "ZERO_RESULTS") {
        return res.status(400).json({
          error: "Address must be located within the Philippines.",
        });
      } else {
        return res.status(400).json({
          error: `Geocoding API Error: ${geocodeResponse.data.status}`,
        });
      }
    }

    // Save category with formatted address
    const category = await categoryDAL.createCategory(req.body);
    res.status(201).json({ message: "Category created successfully", category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper function to extract address components by type
function getAddressComponent(result, type) {
  const component = result.address_components.find((comp) =>
    comp.types.includes(type)
  );
  return component ? component.long_name : null;
}


// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await categoryDAL.getAllCategories();
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
