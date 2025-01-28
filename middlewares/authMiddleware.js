const jwt = require('jsonwebtoken');
const userDal = require('../DAL/userDal');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userDal.getUserById(decoded.id);

    if (!user || user.authToken !== token) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = decoded; // Attach user to request
    next();
  } catch (err) {
    return res
      .status(403)
      .json({ message: 'Invalid token', error: err.message });
  }
};


const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('User Info:', req.user);

    // Check if the user's role is included in the allowed roles
    if (req.user && roles.includes(req.user.userType)) {
      return next();
    }

    return res
      .status(403)
      .json({ message: 'Access denied: Unauthorized role' });
  };
};

module.exports = { authenticateToken, authorize };

