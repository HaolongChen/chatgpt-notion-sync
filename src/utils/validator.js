/**
 * Data Validator
 * 
 * Validates data against JSON schemas using AJV.
 * Handles both the conversation insights schema and custom schemas.
 * 
 * @module utils/validator
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class Validator {
  constructor(config = {}) {
    this.config = config;
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      validateFormats: true,
      ...config.ajvOptions,
    });
    addFormats(this.ajv);
    this.schemas = new Map();
  }

  /**
   * Load a schema from file
   * @param {string} schemaPath - Path to schema file
   * @returns {Promise<Object>} Loaded schema
   */
  async loadSchema(schemaPath) {
    try {
      // Try multiple possible paths
      const possiblePaths = [
        schemaPath,
        path.join(process.cwd(), schemaPath),
        path.join(process.cwd(), 'schemas', path.basename(schemaPath)),
        path.join(process.cwd(), 'config', path.basename(schemaPath)),
      ];

      let schemaContent = null;
      let usedPath = null;

      for (const tryPath of possiblePaths) {
        try {
          schemaContent = await fs.readFile(tryPath, 'utf-8');
          usedPath = tryPath;
          break;
        } catch (err) {
          // Try next path
          continue;
        }
      }

      if (!schemaContent) {
        throw new Error(`Schema file not found: ${schemaPath}`);
      }

      const schema = JSON.parse(schemaContent);
      logger.debug('Schema loaded', { path: usedPath });
      return schema;
    } catch (error) {
      logger.error('Failed to load schema', {
        path: schemaPath,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Load the default conversation insights schema
   * @returns {Promise<Object>} Schema object
   */
  async loadConversationSchema() {
    const schemaPath = 'schemas/conversation-insights-schema.json';
    return this.loadSchema(schemaPath);
  }

  /**
   * Register a schema
   * @param {string} name - Schema name
   * @param {Object} schema - Schema object
   */
  registerSchema(name, schema) {
    try {
      const validate = this.ajv.compile(schema);
      this.schemas.set(name, validate);
      logger.debug('Schema registered', { name });
    } catch (error) {
      logger.error('Failed to register schema', {
        name,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Validate data against a schema
   * @param {Object} data - Data to validate
   * @param {string|Object} schema - Schema name or schema object
   * @returns {Object} Validation result { valid, errors }
   */
  validate(data, schema) {
    try {
      let validate;

      if (typeof schema === 'string') {
        // Use registered schema
        validate = this.schemas.get(schema);
        if (!validate) {
          throw new Error(`Schema not found: ${schema}`);
        }
      } else {
        // Compile schema on the fly
        validate = this.ajv.compile(schema);
      }

      const valid = validate(data);

      if (!valid) {
        const errors = validate.errors.map(err => ({
          field: err.instancePath || err.params.missingProperty || 'unknown',
          message: err.message,
          keyword: err.keyword,
          params: err.params,
        }));

        return { valid: false, errors };
      }

      return { valid: true, errors: null };
    } catch (error) {
      logger.error('Validation error', { error: error.message });
      return {
        valid: false,
        errors: [{ field: 'schema', message: error.message }],
      };
    }
  }

  /**
   * Validate multiple data objects
   * @param {Array<Object>} dataArray - Array of data objects
   * @param {string|Object} schema - Schema name or schema object
   * @returns {Object} Validation results { valid, invalid, errors }
   */
  validateMany(dataArray, schema) {
    const results = {
      valid: [],
      invalid: [],
      errors: [],
    };

    for (let i = 0; i < dataArray.length; i++) {
      const data = dataArray[i];
      const validation = this.validate(data, schema);

      if (validation.valid) {
        results.valid.push({ index: i, data });
      } else {
        results.invalid.push({ index: i, data });
        results.errors.push({
          index: i,
          dataId: data.conversation_id || data.ConversationID || `item_${i}`,
          errors: validation.errors,
        });
      }
    }

    logger.info('Batch validation complete', {
      total: dataArray.length,
      valid: results.valid.length,
      invalid: results.invalid.length,
    });

    return results;
  }
}

module.exports = { Validator };
