/**
 * Sync Orchestrator
 * 
 * Orchestrates the entire sync process:
 * - Loads data from files
 * - Validates data
 * - Transforms data
 * - Syncs to Notion
 * - Tracks progress and errors
 * 
 * @module services/syncOrchestrator
 */

const path = require('path');
const logger = require('../utils/logger');
const { FileLoader } = require('./fileLoader');
const { Validator } = require('../utils/validator');
const { chunkArray } = require('../utils/helpers');

class SyncOrchestrator {
  constructor({ notionClient, dataTransformer, chatgptService, config, logger: customLogger }) {
    this.notionClient = notionClient;
    this.dataTransformer = dataTransformer;
    this.chatgptService = chatgptService;
    this.config = config;
    this.logger = customLogger || logger;

    this.fileLoader = new FileLoader({
      dataDir: path.join(process.cwd(), 'data'),
    });

    this.validator = new Validator(config.validation);
  }

  /**
   * Initialize the orchestrator
   */
  async initialize() {
    try {
      // Load and register schema
      const schema = await this.validator.loadConversationSchema();
      this.validator.registerSchema('conversation', schema);
      this.logger.info('Schema loaded and registered');
    } catch (error) {
      this.logger.warn('Could not load schema, validation may be limited', {
        error: error.message,
      });
    }
  }

  /**
   * Validate data files
   * @returns {Promise<Object>} Validation results
   */
  async validate() {
    this.logger.info('Starting validation...');

    try {
      await this.initialize();

      // Load data files
      const dataObjects = await this.fileLoader.loadAllFiles();
      this.logger.info('Loaded data files', { count: dataObjects.length });

      if (dataObjects.length === 0) {
        return {
          valid: 0,
          invalid: 0,
          total: 0,
          errors: [],
        };
      }

      // Validate data
      const validationResults = this.validator.validateMany(dataObjects, 'conversation');

      return {
        valid: validationResults.valid.length,
        invalid: validationResults.invalid.length,
        total: dataObjects.length,
        errors: validationResults.errors,
      };
    } catch (error) {
      this.logger.error('Validation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Main sync process
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync results
   */
  async sync(options = {}) {
    const { dryRun = false, validate = true, force = false } = options;

    this.logger.info('Starting sync', { dryRun, validate, force });

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      errors: [],
      duration: 0,
    };

    const startTime = Date.now();

    try {
      await this.initialize();

      // Load data files
      this.logger.progress('Loading data files...');
      const dataObjects = await this.fileLoader.loadAllFiles();
      results.total = dataObjects.length;

      if (dataObjects.length === 0) {
        this.logger.warn('No data files found to sync');
        return results;
      }

      this.logger.success(`Loaded ${dataObjects.length} records`);

      // Validate if requested
      let validData = dataObjects;
      if (validate) {
        this.logger.progress('Validating data...');
        const validationResults = this.validator.validateMany(dataObjects, 'conversation');

        if (validationResults.invalid.length > 0) {
          this.logger.warn('Validation errors found', {
            invalid: validationResults.invalid.length,
          });

          if (!force) {
            this.logger.error('Validation failed. Use --force to sync anyway.');
            results.failed = validationResults.invalid.length;
            results.errors = validationResults.errors;
            results.duration = Date.now() - startTime;
            return results;
          }
        }

        validData = validationResults.valid.map(v => v.data);
        results.skipped = validationResults.invalid.length;
        this.logger.success(`Validated ${validData.length} records`);
      }

      if (validData.length === 0) {
        this.logger.warn('No valid data to sync');
        return results;
      }

      // Enrich data with ChatGPT-specific fields
      this.logger.progress('Enriching data...');
      const enrichedData = validData.map(data =>
        this.chatgptService.enrichData(data)
      );
      this.logger.success('Data enriched');

      // Transform data to Notion format
      this.logger.progress('Transforming data...');
      const transformedRecords = enrichedData.map(data => {
        const properties = this.dataTransformer.transformToNotionProperties(data);
        const conversationId = this.dataTransformer.getConversationId(data);
        return { properties, conversationId };
      });
      this.logger.success('Data transformed');

      // Dry run - don't actually sync
      if (dryRun) {
        this.logger.info('Dry run - no changes made to Notion');
        results.created = transformedRecords.length;
        results.duration = Date.now() - startTime;
        return results;
      }

      // Sync to Notion in batches
      const batchSize = this.config.sync?.batchSize || 10;
      const batches = chunkArray(transformedRecords, batchSize);

      this.logger.progress(`Syncing ${transformedRecords.length} records in ${batches.length} batches...`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.logger.info(`Processing batch ${i + 1}/${batches.length}`, {
          records: batch.length,
        });

        const batchResults = await this.notionClient.batchSync(batch);

        results.created += batchResults.created;
        results.updated += batchResults.updated;
        results.failed += batchResults.failed;
        results.errors.push(...batchResults.errors);
      }

      results.duration = Date.now() - startTime;

      this.logger.success('Sync complete', {
        created: results.created,
        updated: results.updated,
        failed: results.failed,
        duration: `${(results.duration / 1000).toFixed(2)}s`,
      });

      return results;
    } catch (error) {
      this.logger.error('Sync failed', { error: error.message, stack: error.stack });
      results.duration = Date.now() - startTime;
      throw error;
    }
  }
}

module.exports = { SyncOrchestrator };
