const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authRateLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

// Public auth endpoints protected by rate limiting
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);

// Protected auth endpoints
router.get('/me', protect, getMe);

module.exports = router;
