const express = require('express');
const logger = require('../config/logger');
const shutdownAuth = require('../middleware/shutdownAuth');
const { sequelize } = require('../config/database');

const router = express.Router();

/**
 * POST /api/shutdown
 * Gracefully shutdown the application
 */
router.post('/', shutdownAuth, async (req, res) => {
  logger.info('Shutdown request received');

  res.json({ message: 'Shutdown initiated' });

  // Give response time to be sent
  setTimeout(async () => {
    try {
      logger.info('Closing database connections...');
      await sequelize.close();

      logger.info('Shutting down application');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }, 1000);
});

module.exports = router;
