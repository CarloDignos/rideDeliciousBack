const PaymentMethod = require('../models/paymentMethod.model');
const QRCode = require('qrcode');

// Create a Payment Method
exports.createPaymentMethod = async (req, res) => {
  const { type, gcashDetails } = req.body;

  try {
    if (type === 'GCash' && gcashDetails?.number) {
      // Generate QR Code for GCash
      const qrCode = await QRCode.toDataURL(`GCash:${gcashDetails.number}`);
      const paymentMethod = new PaymentMethod({
        type,
        gcashDetails: { ...gcashDetails, qrCode },
      });
      await paymentMethod.save();
      res
        .status(201)
        .json({ message: 'Payment method created', paymentMethod });
    } else if (type === 'COD') {
      const paymentMethod = new PaymentMethod({ type });
      await paymentMethod.save();
      res
        .status(201)
        .json({ message: 'Payment method created', paymentMethod });
    } else {
      res.status(400).json({ message: 'Invalid payment method or details' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = await PaymentMethod.find();
    res.status(200).json(paymentMethods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAvailablePaymentMethods = async (req, res) => {
  try {
    // Fetch all payment methods (you can add filters if needed, e.g., only active methods)
    const paymentMethods = await PaymentMethod.find();

    // Return only necessary fields to the customer
    const formattedMethods = paymentMethods.map((method) => ({
      id: method._id,
      type: method.type,
      ...(method.type === 'GCash' && {
        gcashDetails: {
          number: method.gcashDetails?.number,
          qrCode: method.gcashDetails?.qrCode,
        },
      }),
    }));

    res.status(200).json({ paymentMethods: formattedMethods });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

