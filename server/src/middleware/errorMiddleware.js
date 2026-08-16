const env = require('../config/env');
const ApiError = require('../utils/apiError');

/**
 * Centralized Global Error Handling Middleware.
 */
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }

  const response = {
    success: false,
    message: error.message,
    ...(env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  res.status(error.statusCode).json(response);
};

module.exports = errorMiddleware;
