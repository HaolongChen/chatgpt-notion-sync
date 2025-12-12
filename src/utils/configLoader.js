/**
 * Configuration Loader
 * 
 * Loads and merges configuration from multiple sources:
 * - Default configuration file (config/default.json)
 * - Environment-specific configuration
 * - Environment variables
 * 
 * @module utils/configLoader
 */

const config = require('config');

/**
 * Load and validate configuration
 * @returns {Object} Merged configuration object
 */
async function loadConfig() {
  // Lazy load logger to avoid circular dependency
  const logger = require('./logger');
  
  try {
    const appConfig = {
      sync: config.get('sync'),
      rateLimit: config.get('rateLimit'),
      retry: config.get('retry'),
      timeout: config.get('timeout'),
      validation: config.get('validation'),
      logging: config.get('logging'),
      monitoring: config.has('monitoring') ? config.get('monitoring') : {},
      database: config.has('database') ? config.get('database') : {},
      error: config.has('error') ? config.get('error') : {},
    };

    // Override with environment variables if present
    if (process.env.SYNC_BATCH_SIZE) {
      appConfig.sync.batchSize = parseInt(process.env.SYNC_BATCH_SIZE, 10);
    }
    if (process.env.DRY_RUN === 'true') {
      appConfig.sync.dryRun = true;
    }
    if (process.env.LOG_LEVEL) {
      appConfig.logging.level = process.env.LOG_LEVEL;
    }

    logger.debug('Configuration loaded', {
      batchSize: appConfig.sync.batchSize,
      dryRun: appConfig.sync.dryRun,
      logLevel: appConfig.logging.level,
    });

    return appConfig;
  } catch (error) {
    // Use console for error since logger might not be available
    console.error('Failed to load configuration:', error.message);
    throw error;
  }
}

/**
 * Get a specific configuration value
 * @param {string} key - Configuration key (dot notation supported)
 * @param {*} defaultValue - Default value if key not found
 * @returns {*} Configuration value
 */
function getConfigValue(key, defaultValue = null) {
  // Lazy load logger to avoid circular dependency
  const logger = require('./logger');
  
  try {
    return config.has(key) ? config.get(key) : defaultValue;
  } catch (error) {
    logger.warn('Failed to get config value', { key, error: error.message });
    return defaultValue;
  }
}

module.exports = {
  loadConfig,
  getConfigValue,
};
