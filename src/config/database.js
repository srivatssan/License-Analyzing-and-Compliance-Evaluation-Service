const { Sequelize } = require('sequelize');
const path = require('path');
const logger = require('./logger');

const databasePath = process.env.DATABASE_PATH || './data/paacdb.sqlite';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.resolve(databasePath),
  logging: (msg) => logger.debug(msg),
  define: {
    timestamps: false,
    freezeTableName: true
  }
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
};

const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: false });
    logger.info('Database synchronized');
  } catch (error) {
    logger.error('Database sync failed:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase
};
