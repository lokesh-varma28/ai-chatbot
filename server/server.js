const dns = require('dns');

// Override DNS servers for Node process to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./src/config/env');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const conversationRoutes = require('./src/routes/conversationRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const notFoundMiddleware = require('./src/middleware/notFoundMiddleware');
const errorMiddleware = require('./src/middleware/errorMiddleware');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://ai-chatbot-f3t9.vercel.app',
];

if (env.FRONTEND_URL && !allowedOrigins.includes(env.FRONTEND_URL)) {
  allowedOrigins.push(env.FRONTEND_URL);
}

// Security and utility middlewares
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoints
app.get(['/health', '/api/v1/health'], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Chatbot API is running',
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/chat', chatRoutes);

// 404 handler for unknown routes
app.use(notFoundMiddleware);

// Global centralized error handler
app.use(errorMiddleware);

// Graceful server initialization
const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Start HTTP Server
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`📍 Health Check Endpoint: http://localhost:${env.PORT}/api/v1/health`);
    });

    // Graceful shutdown handler
    const handleShutdown = (signal) => {
      console.log(`\n⚠️ Received ${signal}. Shutting down server gracefully...`);
      server.close(() => {
        console.log('🛑 Express server HTTP connections closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

  } catch (error) {
    console.error(`💥 Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Global unhandled error handlers
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...', err);
  process.exit(1);
});

startServer();
