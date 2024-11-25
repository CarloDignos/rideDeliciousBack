const Address = require('../models/Address');

const createAddress = async (addressData) => {
    const address = new Address(addressData);
    return await address.save();
};

const getAddressById = async (addressId) => {
    return Address.findById(addressId); // Replace `AddressModel` with your address model
};

module.exports = {
    createAddress,
    getAddressById,
};
