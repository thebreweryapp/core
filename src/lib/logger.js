const logger = require('@amberjs/log');

module.exports = ({ config }) => {
  try {
    logger.initLogger(config.logging);
  } catch (e) {
    logger.error(e);
  }

  return logger;
};
