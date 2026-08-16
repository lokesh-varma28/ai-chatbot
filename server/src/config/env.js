const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from server root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates required environment variables and returns configuration object.
 */
const validateEnv = () => {
  const requiredEnvs = ['PORT', 'NODE_ENV'];
  const missing = [];

  requiredEnvs.forEach((key) => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    throw new Error(`[Env Config Error] Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    PORT: parseInt(process.env.PORT, 10) || 5000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chatbot',
    NODE_ENV: process.env.NODE_ENV || 'development',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_dev_key_2026',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    isProduction: process.env.NODE_ENV === 'production',
  };
};

const env = validateEnv();

module.exports = env;
