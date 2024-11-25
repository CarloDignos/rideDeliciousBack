const jwt = require('jsonwebtoken');
const userDal = require('../DAL/userDal');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication failed: No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userDal.getUserById(decoded.id);

        if (!user || user.authToken !== token) {
            return res.status(401).json({ message: 'Authentication failed: Invalid or expired token' });
        }

        req.user = decoded; // Attach the decoded user to the request
        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        return res.status(403).json({ message: 'Invalid token', error: err.message });
    }
};

const authorize = (role) => (req, res, next) => {
    console.log("User Info:", req.user);
    if (req.user && req.user.role === role) {
      return next();
    }
    return res.status(403).json({ message: "Access denied: Unauthorized role" });
  };
  

module.exports = { authenticateToken, authorize };

