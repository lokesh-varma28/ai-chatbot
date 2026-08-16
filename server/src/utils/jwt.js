const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Sign a JWT token for a given user ID.
 * @param {string} userId - Mongo user ID
 * @returns {string} JWT Token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

/**
 * Verify a JWT token.
 * @param {string} token - JWT Token
 * @returns {object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken,
};
