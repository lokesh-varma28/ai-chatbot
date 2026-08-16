/**
 * Centralized API Error class for handling operational HTTP errors cleanly.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error description
   * @param {boolean} isOperational - Whether this is an operational error vs system crash
   * @param {string} stack - Optional stack trace
   */
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message) {
    return new ApiError(400, message);
  }

  static unauthorized(message = 'Unauthorized access') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Access forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, false);
  }
}

module.exports = ApiError;
