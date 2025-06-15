// In backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if MongoDB is bypassed for testing
      if (global.bypassMongoDB) {
        // Create a mock user for testing
        req.user = {
          _id: decoded.id || 'mock-user-id',
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin' // Give admin role for testing
        };
        return next();
      }

      // Get user from the token (and select the role field)
      req.user = await User.findById(decoded.id).select('-password'); // This automatically includes 'role' if it's in the schema.
                                                                       // If not, use .select('-password +role') or similar
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// New middleware for role-based authorization
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            res.status(403);
            throw new Error('Not authorized, user role missing');
        }
        if (!roles.includes(req.user.role)) {
            res.status(403);
            throw new Error(`User role (${req.user.role}) is not authorized to access this resource`);
        }
        next();
    };
};

module.exports = { protect, authorizeRoles };