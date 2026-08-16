const ApiError = require('../utils/apiError');

/**
 * Handles 404 Not Found errors for unmatched routes.
 */
const notFoundMiddleware = (req, res, next) => {
  const error = ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`);
  next(error);
};

module.exports = notFoundMiddleware;
