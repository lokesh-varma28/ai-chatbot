const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication endpoints (login, register).
 * Max 20 requests per 15 minutes per IP.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

/**
 * Rate limiter for AI Chat requests to protect Gemini API quota.
 * Max 40 requests per minute per IP.
 */
const chatRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many chat requests. Please wait a moment before sending another prompt.',
  },
});

module.exports = {
  authRateLimiter,
  chatRateLimiter,
};
