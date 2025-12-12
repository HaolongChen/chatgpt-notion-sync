/**
 * Notion Client Service
 * 
 * Wrapper around @notionhq/client with additional features:
 * - Rate limiting
 * - Automatic retries with exponential backoff
 * - Error handling
 * - Batch operations
 * 
 * @module services/notionClient
 */

const { Client } = require('@notionhq/client');
const pLimit = require('p-limit');
const logger = require('../utils/logger');
const { NotionApiError } = require('../utils/errors');
const { sleep, retryWithBackoff } = require('../utils/helpers');

class NotionClient {
  constructor(apiKey, databaseId, config = {}) {
    if (!apiKey) {
      throw new Error('Notion API key is required');
    }
    if (!databaseId) {
      throw new Error('Notion database ID is required');
    }

    this.client = new Client({ auth: apiKey });
    this.databaseId = databaseId;
    this.config = config;

    // Rate limiting setup
    const rateLimit = config.rateLimit?.notion || {};
    this.rateLimiter = pLimit(rateLimit.maxConcurrent || 3);
    this.requestsPerSecond = rateLimit.requestsPerSecond || 3;
    this.lastRequestTime = 0;

    // Retry configuration
    this.retryConfig = config.retry || {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    };

    logger.info('Notion client initialized', {
      databaseId,
      rateLimit: this.requestsPerSecond,
      maxConcurrent: rateLimit.maxConcurrent,
    });
  }

  /**
   * Apply rate limiting
   */
  async applyRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.requestsPerSecond;

    if (timeSinceLastRequest < minInterval) {
      await sleep(minInterval - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Execute API call with rate limiting and retries
   */
  async executeWithRetry(fn, context = {}) {
    return this.rateLimiter(async () => {
      await this.applyRateLimit();

      return retryWithBackoff(fn, {
        maxAttempts: this.retryConfig.maxAttempts,
        initialDelay: this.retryConfig.initialDelayMs,
        maxDelay: this.retryConfig.maxDelayMs,
        backoffMultiplier: this.retryConfig.backoffMultiplier,
      });
    });
  }

  /**
   * Query database for existing page by ConversationID
   * @param {string} conversationId - Conversation ID to search for
   * @returns {Promise<string|null>} Page ID if found, null otherwise
   */
  async findExistingPage(conversationId) {
    try {
      const response = await this.executeWithRetry(async () => {
        return await this.client.databases.query({
          database_id: this.databaseId,
          filter: {
            property: 'ConversationID',
            title: {
              equals: conversationId,
            },
          },
        });
      });

      if (response.results.length > 0) {
        const pageId = response.results[0].id;
        logger.debug('Found existing page', { conversationId, pageId });
        return pageId;
      }

      return null;
    } catch (error) {
      throw new NotionApiError(
        `Failed to query database: ${error.message}`,
        error.status,
        error.code
      );
    }
  }

  /**
   * Create a new page in the database
   * @param {Object} properties - Notion properties object
   * @returns {Promise<Object>} Created page info
   */
  async createPage(properties) {
    try {
      const response = await this.executeWithRetry(async () => {
        return await this.client.pages.create({
          parent: { database_id: this.databaseId },
          properties,
        });
      });

      const conversationId = properties.ConversationID?.title?.[0]?.text?.content;
      logger.info('Created Notion page', {
        pageId: response.id,
        conversationId,
      });

      return {
        success: true,
        pageId: response.id,
        action: 'created',
        conversationId,
      };
    } catch (error) {
      throw new NotionApiError(
        `Failed to create page: ${error.message}`,
        error.status,
        error.code
      );
    }
  }

  /**
   * Update an existing page
   * @param {string} pageId - Page ID to update
   * @param {Object} properties - Notion properties object
   * @returns {Promise<Object>} Updated page info
   */
  async updatePage(pageId, properties) {
    try {
      const response = await this.executeWithRetry(async () => {
        return await this.client.pages.update({
          page_id: pageId,
          properties,
        });
      });

      const conversationId = properties.ConversationID?.title?.[0]?.text?.content;
      logger.info('Updated Notion page', {
        pageId: response.id,
        conversationId,
      });

      return {
        success: true,
        pageId: response.id,
        action: 'updated',
        conversationId,
      };
    } catch (error) {
      throw new NotionApiError(
        `Failed to update page: ${error.message}`,
        error.status,
        error.code
      );
    }
  }

  /**
   * Sync a single record to Notion (create or update)
   * @param {Object} properties - Notion properties object
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Object>} Sync result
   */
  async syncRecord(properties, conversationId) {
    try {
      const existingPageId = await this.findExistingPage(conversationId);

      if (existingPageId) {
        return await this.updatePage(existingPageId, properties);
      } else {
        return await this.createPage(properties);
      }
    } catch (error) {
      logger.error('Failed to sync record', {
        conversationId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        conversationId,
      };
    }
  }

  /**
   * Batch sync multiple records
   * @param {Array<Object>} records - Array of {properties, conversationId}
   * @returns {Promise<Object>} Batch sync results
   */
  async batchSync(records) {
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    logger.info('Starting batch sync', { total: records.length });

    const promises = records.map(record =>
      this.syncRecord(record.properties, record.conversationId)
    );

    const outcomes = await Promise.allSettled(promises);

    outcomes.forEach((outcome, index) => {
      const record = records[index];

      if (outcome.status === 'fulfilled' && outcome.value.success) {
        if (outcome.value.action === 'created') {
          results.created++;
        } else {
          results.updated++;
        }
      } else {
        results.failed++;
        const error =
          outcome.status === 'rejected'
            ? outcome.reason.message
            : outcome.value.error;

        results.errors.push({
          conversationId: record.conversationId,
          error,
        });
      }
    });

    logger.info('Batch sync complete', results);

    return results;
  }

  /**
   * Get database schema/properties
   * @returns {Promise<Object>} Database properties
   */
  async getDatabaseSchema() {
    try {
      const response = await this.executeWithRetry(async () => {
        return await this.client.databases.retrieve({
          database_id: this.databaseId,
        });
      });

      logger.debug('Retrieved database schema', {
        title: response.title[0]?.plain_text,
        propertiesCount: Object.keys(response.properties).length,
      });

      return response.properties;
    } catch (error) {
      throw new NotionApiError(
        `Failed to retrieve database schema: ${error.message}`,
        error.status,
        error.code
      );
    }
  }
}

module.exports = { NotionClient };
