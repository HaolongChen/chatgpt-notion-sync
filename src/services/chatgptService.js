/**
 * ChatGPT Service
 * 
 * Handles ChatGPT-specific operations including:
 * - Conversation URL generation
 * - Data enrichment
 * - Conversation metadata extraction
 * 
 * @module services/chatgptService
 */

const logger = require('../utils/logger');

class ChatGPTService {
  constructor(config = {}) {
    this.config = config;
    this.baseUrl = 'https://chat.openai.com/c';
  }

  /**
   * Generate ChatGPT conversation URL from conversation ID
   * @param {string} conversationId - Conversation ID (e.g., 'conv_abc123')
   * @returns {string} Full conversation URL
   */
  generateConversationUrl(conversationId) {
    if (!conversationId) {
      return null;
    }

    // Remove 'conv_' prefix if present
    const cleanId = conversationId.replace(/^conv_/, '');

    const url = `${this.baseUrl}/${cleanId}`;
    logger.debug('Generated conversation URL', { conversationId, url });

    return url;
  }

  /**
   * Enrich data with ChatGPT-specific fields
   * @param {Object} data - Conversation data
   * @returns {Object} Enriched data
   */
  enrichData(data) {
    const enriched = { ...data };

    // Add conversation URL if not present
    if (!enriched.conversation_url && !enriched.ConversationURL) {
      const conversationId = enriched.conversation_id || enriched.ConversationID;
      if (conversationId) {
        enriched.conversation_url = this.generateConversationUrl(conversationId);
      }
    }

    // Add metadata timestamp if not present
    if (!enriched.analysis_date && !enriched.AnalysisDate) {
      enriched.analysis_date = new Date().toISOString();
    }

    // Add GitHub source reference if not present
    if (!enriched.github_source && !enriched.GitHubSource) {
      enriched.github_source = 'chatgpt-notion-sync';
    }

    return enriched;
  }

  /**
   * Extract conversation ID from various formats
   * @param {string|Object} input - Conversation ID or object containing it
   * @returns {string|null} Extracted conversation ID
   */
  extractConversationId(input) {
    if (typeof input === 'string') {
      return input;
    }

    if (typeof input === 'object' && input !== null) {
      return input.conversation_id || input.ConversationID || null;
    }

    return null;
  }

  /**
   * Validate conversation ID format
   * @param {string} conversationId - Conversation ID to validate
   * @returns {boolean} True if valid
   */
  isValidConversationId(conversationId) {
    if (!conversationId || typeof conversationId !== 'string') {
      return false;
    }

    // Check if it matches expected pattern (conv_ prefix or just alphanumeric)
    const pattern = /^(conv_)?[a-zA-Z0-9-]+$/;
    return pattern.test(conversationId);
  }

  /**
   * Parse ChatGPT export data
   * @param {Object} exportData - Raw export data
   * @returns {Object} Parsed and structured data
   */
  parseExportData(exportData) {
    // Handle different export formats
    if (Array.isArray(exportData)) {
      return exportData.map(item => this.enrichData(item));
    }

    return this.enrichData(exportData);
  }
}

module.exports = { ChatGPTService };
