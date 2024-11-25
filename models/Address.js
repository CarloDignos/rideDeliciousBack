const mongoose = require('mongoose');

// Address schema
const AddressSchema = new mongoose.Schema({
    streetNumber: { type: String, required: true },
    baranggay: { type: String, required: true },
    cityOrTown: { type: String, required: true },
    province: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'Philippines' }, // Assuming default country is the Philippines
    latitude: { type: Number, required: false }, // Added latitude
    longitude: { type: Number, required: false }, // Added longitude
});

module.exports = mongoose.model('Address', AddressSchema);
