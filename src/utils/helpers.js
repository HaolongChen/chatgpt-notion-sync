/**
 * Helper Utilities
 * 
 * Common utility functions used throughout the application.
 * 
 * @module utils/helpers
 */

const crypto = require('crypto');

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate string to maximum length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add if truncated
 * @returns {string} Truncated string
 */
function truncate(str, maxLength = 100, suffix = '...') {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Generate a hash for a string
 * @param {string} str - String to hash
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {string} Hash hex string
 */
function generateHash(str, algorithm = 'sha256') {
  return crypto.createHash(algorithm).update(str).digest('hex');
}

/**
 * Convert snake_case to PascalCase
 * @param {string} str - Snake case string
 * @returns {string} PascalCase string
 */
function snakeToPascal(str) {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert PascalCase to snake_case
 * @param {string} str - PascalCase string
 * @returns {string} snake_case string
 */
function pascalToSnake(str) {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Convert object keys from snake_case to PascalCase
 * @param {Object} obj - Object with snake_case keys
 * @returns {Object} Object with PascalCase keys
 */
function convertKeysToPascal(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToPascal(item));
  }
  
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = snakeToPascal(key);
    result[newKey] = convertKeysToPascal(value);
  }
  return result;
}

/**
 * Convert object keys from PascalCase to snake_case
 * @param {Object} obj - Object with PascalCase keys
 * @returns {Object} Object with snake_case keys
 */
function convertKeysToSnake(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToSnake(item));
  }
  
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = pascalToSnake(key);
    result[newKey] = convertKeysToSnake(value);
  }
  return result;
}

/**
 * Safely get nested property from object
 * @param {Object} obj - Object to query
 * @param {string} path - Dot-notation path
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Value at path or default
 */
function getNestedValue(obj, path, defaultValue = null) {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }

  return current;
}

/**
 * Chunk array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array<Array>} Array of chunks
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted string
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<*>} Function result
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        break;
      }

      await sleep(Math.min(delay, maxDelay));
      delay *= backoffMultiplier;
    }
  }

  throw lastError;
}

module.exports = {
  sleep,
  truncate,
  generateHash,
  snakeToPascal,
  pascalToSnake,
  convertKeysToPascal,
  convertKeysToSnake,
  getNestedValue,
  chunkArray,
  formatBytes,
  retryWithBackoff,
};
