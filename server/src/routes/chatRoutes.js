const express = require('express');
const { handleChat } = require('../controllers/chatController');
const { optionalAuth } = require('../middleware/authMiddleware');
const { chatRateLimiter } = require('../middleware/rateLimitMiddleware');

const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Middleware wrapper for multer error handling
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return next(err);
    }
    next();
  });
};

/**
 * Route definition for AI chat endpoint.
 * Full path: POST /api/v1/chat
 */
router.post('/', chatRateLimiter, optionalAuth, handleUpload, handleChat);

module.exports = router;
