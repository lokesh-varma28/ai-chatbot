const mongoose = require('mongoose');
const env = require('./env');

/**
 * Connects to MongoDB database using Mongoose with short connection timeout.
 */
const connectDB = async () => {
  try {
    if (!env.MONGODB_URI) {
      console.warn('⚠️ Warning: MONGODB_URI environment variable is not defined.');
      return null;
    }

    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000, // 3-second timeout for local DB discovery
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Warning: ${error.message}`);
    console.warn('⚠️ Server running without active MongoDB connection. Start MongoDB or update MONGODB_URI in .env for database features.');
    return null;
  }
};

module.exports = connectDB;
