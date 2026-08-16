const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { verifyToken } = require('../utils/jwt');

/**
 * Protect routes by verifying JWT in Authorization header.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw ApiError.unauthorized('Authentication token is required');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired authentication token');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw ApiError.unauthorized('User associated with token no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware for endpoints supporting both auth and anonymous users.
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = user;
        }
      } catch (err) {
        // Token invalid, ignore for optional auth
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  protect,
  optionalAuth,
};
