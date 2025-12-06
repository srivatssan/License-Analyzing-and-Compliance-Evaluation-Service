const logger = require('../config/logger');

/**
 * Middleware to authenticate shutdown API requests
 */
const shutdownAuth = (req, res, next) => {
  const apiKey = req.headers['x-aig-shutdown-key'] || req.headers['x-api-key'];
  const configuredKey = process.env.SHUTDOWN_API_KEY || 'dummy-key';

  if (!apiKey || apiKey !== configuredKey) {
    logger.warn('Unauthorized shutdown attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

module.exports = shutdownAuth;
