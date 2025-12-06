require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const logger = require('./config/logger');
const { testConnection, syncDatabase } = require('./config/database');
const spdxRegistry = require('./services/SpdxLicenseRegistry');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const githubRoutes = require('./routes/github');
const spdxRoutes = require('./routes/spdx');
const policyRoutes = require('./routes/policy');
const complianceRunsRoutes = require('./routes/complianceRuns');
const shutdownRoutes = require('./routes/shutdown');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for AlpineJS
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/github', githubRoutes);
app.use('/api/spdx', spdxRoutes);
app.use('/api/policy', policyRoutes);
app.use('/api/compliance-runs', complianceRunsRoutes);
app.use('/api/shutdown', shutdownRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

/**
 * Initialize application
 */
async function initialize() {
  try {
    logger.info('=== OSS License Analyzer - Node.js ===');
    logger.info('Initializing application...');

    // Test database connection
    await testConnection();

    // Sync database schema
    await syncDatabase();

    // Initialize SPDX license registry
    spdxRegistry.initialize();

    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Application initialization failed:', error);
    process.exit(1);
  }
}

/**
 * Start server
 */
async function start() {
  await initialize();

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Access the application at: http://localhost:${PORT}`);
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
start();

module.exports = app;
