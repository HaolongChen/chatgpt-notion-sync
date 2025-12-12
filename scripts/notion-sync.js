#!/usr/bin/env node

/**
 * Notion Sync Script - FIXED VERSION
 * Syncs JSON data from /data directory to Notion database
 * Handles validation, transformation, batching, and error recovery
 * 
 * FIXES:
 * - Schema path corrected to ../schemas/conversation-insights-schema.json
 * - Field name mapping from snake_case to PascalCase
 * - ChatGPT URL generation added
 * - Proper handling of nested objects and arrays
 * - Robust data transformation for Notion API
 */

const fs = require('fs').promises;
const path = require('path');
const { Client } = require('@notionhq/client');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const winston = require('winston');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Notion Configuration
  NOTION_API_KEY: process.env.NOTION_API_KEY,
  NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID,
  
  // File Paths
  DATA_DIR: path.join(__dirname, '../data'),
  SCHEMA_FILE: path.join(__dirname, '../schemas/conversation-insights-schema.json'), // FIXED: Correct path
  SYNC_STATUS_FILE: path.join(__dirname, '../data/.sync-status.json'),
  
  // Rate Limiting & Batching
  BATCH_SIZE: 3, // Notion API rate limit: 3 requests per second
  BATCH_DELAY_MS: 1000, // Delay between batches
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: path.join(__dirname, '../logs/sync.log'),
};

// ============================================================================
// LOGGER SETUP
// ============================================================================

const logger = winston.createLogger({
  level: CONFIG.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'notion-sync' },
  transports: [
    new winston.transports.File({ 
      filename: CONFIG.LOG_FILE.replace('.log', '-error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ filename: CONFIG.LOG_FILE }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// ============================================================================
// NOTION CLIENT INITIALIZATION
// ============================================================================

let notionClient;

function initializeNotionClient() {
  if (!CONFIG.NOTION_API_KEY) {
    throw new Error('NOTION_API_KEY environment variable is not set');
  }
  if (!CONFIG.NOTION_DATABASE_ID) {
    throw new Error('NOTION_DATABASE_ID environment variable is not set');
  }
  
  notionClient = new Client({ auth: CONFIG.NOTION_API_KEY });
  logger.info('Notion client initialized successfully');
}

// ============================================================================
// SCHEMA VALIDATION
// ============================================================================

const DEFAULT_SCHEMA = {
  type: 'object',
  required: ['conversation_id', 'analysis_date'], // FIXED: Use snake_case
  properties: {
    conversation_id: { type: 'string' },
    analysis_date: { type: 'string', format: 'date-time' },
    conversation_timestamp: { type: 'string', format: 'date-time' },
    conversation_title: { type: 'string' },
    conversation_summary: { type: 'string' },
    technical_insights: { 
      type: 'array', 
      items: { type: 'object' }
    },
    problem_solving_patterns: { 
      type: 'object'
    },
    communication_style: { 
      type: 'object'
    },
    key_skills: { 
      type: 'array', 
      items: { type: 'object' }
    },
    topics_of_interest: { 
      type: 'array', 
      items: { type: 'object' }
    },
    project_interests: { 
      type: 'array', 
      items: { type: 'object' }
    },
    confidence_score: { 
      type: 'number', 
      minimum: 0, 
      maximum: 1 
    },
    metadata: { type: 'object' },
    validation: { type: 'object' }
  },
  additionalProperties: true
};

let validator;

async function loadSchema() {
  try {
    const schemaContent = await fs.readFile(CONFIG.SCHEMA_FILE, 'utf-8');
    const schema = JSON.parse(schemaContent);
    logger.info('Schema loaded from file', { path: CONFIG.SCHEMA_FILE });
    return schema;
  } catch (error) {
    logger.warn('Schema file not found, using default schema', { 
      path: CONFIG.SCHEMA_FILE,
      error: error.message 
    });
    return DEFAULT_SCHEMA;
  }
}

function initializeValidator(schema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  validator = ajv.compile(schema);
  logger.info('Validator initialized');
}

function validateData(data, filename) {
  const valid = validator(data);
  
  if (!valid) {
    const errors = validator.errors.map(err => ({
      field: err.instancePath || err.params.missingProperty,
      message: err.message,
      keyword: err.keyword
    }));
    
    logger.error('Validation failed', { filename, errors });
    return { valid: false, errors };
  }
  
  logger.debug('Validation passed', { filename });
  return { valid: true, errors: null };
}

// ============================================================================
// URL GENERATION - FIXED
// ============================================================================

/**
 * Generate ChatGPT conversation URL from conversation ID
 * @param {string} conversationId - The conversation ID (e.g., "conv_a1b2c3d4e5f6g7h8i9j0")
 * @returns {string} - Full ChatGPT URL
 */
function generateChatGPTUrl(conversationId) {
  if (!conversationId || typeof conversationId !== 'string') {
    logger.warn('Invalid conversation ID for URL generation', { conversationId });
    return '';
  }
  
  // Remove 'conv_' prefix if present and use the ID
  const cleanId = conversationId.replace(/^conv_/, '');
  const url = `https://chat.openai.com/c/${cleanId}`;
  
  logger.debug('Generated ChatGPT URL', { conversationId, url });
  return url;
}

// ============================================================================
// DATA TRANSFORMATION - COMPLETELY REWRITTEN
// ============================================================================

/**
 * Extract simple string array from complex nested objects
 * Useful for converting nested objects to Notion multi-select
 */
function extractSimpleArray(items, key, maxItems = 50) {
  if (!Array.isArray(items) || items.length === 0) return [];
  
  return items
    .slice(0, maxItems)
    .map(item => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        return item[key] || item.name || item.topic || item.skill || JSON.stringify(item);
      }
      return String(item);
    })
    .filter(item => item && item.length > 0)
    .map(item => String(item).slice(0, 100)); // Notion max tag length
}

/**
 * Transform complex conversation insights data to Notion properties
 * Handles the actual data structure from sample-insight.json
 */
function transformToNotionProperties(data) {
  const properties = {};
  
  // ConversationID - Title property (REQUIRED)
  if (data.conversation_id) {
    properties.ConversationID = {
      title: [{ text: { content: String(data.conversation_id).slice(0, 2000) } }]
    };
  } else {
    // Fallback - use a timestamp-based ID if missing
    const fallbackId = `conv_${Date.now()}`;
    properties.ConversationID = {
      title: [{ text: { content: fallbackId } }]
    };
    logger.warn('Missing conversation_id, using fallback', { fallbackId });
  }
  
  // ChatGPT URL - FIXED: Generate proper conversation URL
  if (data.conversation_id) {
    const chatgptUrl = generateChatGPTUrl(data.conversation_id);
    properties.ChatGPTURL = {
      url: chatgptUrl
    };
  }
  
  // Conversation Title - Rich text
  if (data.conversation_title) {
    properties.ConversationTitle = {
      rich_text: [{ text: { content: String(data.conversation_title).slice(0, 2000) } }]
    };
  }
  
  // Conversation Summary - Rich text
  if (data.conversation_summary) {
    properties.ConversationSummary = {
      rich_text: [{ text: { content: String(data.conversation_summary).slice(0, 2000) } }]
    };
  }
  
  // AnalysisDate - Date property
  if (data.analysis_date) {
    try {
      const date = new Date(data.analysis_date);
      properties.AnalysisDate = {
        date: { start: date.toISOString().split('T')[0] }
      };
    } catch (error) {
      logger.warn('Invalid analysis_date format', { date: data.analysis_date });
    }
  }
  
  // ConversationTimestamp - Date property
  if (data.conversation_timestamp) {
    try {
      const date = new Date(data.conversation_timestamp);
      properties.ConversationDate = {
        date: { start: date.toISOString().split('T')[0] }
      };
    } catch (error) {
      logger.warn('Invalid conversation_timestamp format', { date: data.conversation_timestamp });
    }
  }
  
  // LastSyncDate - Date property (always current date)
  properties.LastSyncDate = {
    date: { start: new Date().toISOString().split('T')[0] }
  };
  
  // TechnicalInsights - Multi-select from array of objects
  if (Array.isArray(data.technical_insights) && data.technical_insights.length > 0) {
    const insights = extractSimpleArray(data.technical_insights, 'topic', 100);
    if (insights.length > 0) {
      properties.TechnicalInsights = {
        multi_select: insights.map(name => ({ name }))
      };
    }
  }
  
  // ProblemSolvingPatterns - Multi-select from nested object
  if (data.problem_solving_patterns) {
    const patterns = [];
    
    // Add approach
    if (data.problem_solving_patterns.approach) {
      patterns.push(data.problem_solving_patterns.approach);
    }
    
    // Add thinking style
    if (data.problem_solving_patterns.thinking_style) {
      patterns.push(data.problem_solving_patterns.thinking_style);
    }
    
    // Add identified patterns (take first few)
    if (Array.isArray(data.problem_solving_patterns.patterns_identified)) {
      patterns.push(...data.problem_solving_patterns.patterns_identified.slice(0, 3));
    }
    
    if (patterns.length > 0) {
      properties.ProblemSolvingPatterns = {
        multi_select: patterns.slice(0, 100).map(item => ({ name: String(item).slice(0, 100) }))
      };
    }
  }
  
  // CommunicationStyle - Select property from nested object
  if (data.communication_style) {
    const style = data.communication_style.clarity || 
                  data.communication_style.technical_depth || 
                  data.communication_style.engagement_level ||
                  'unknown';
    properties.CommunicationStyle = {
      select: { name: String(style).slice(0, 100) }
    };
  }
  
  // ConfidenceScore - Number property
  if (typeof data.confidence_score === 'number') {
    properties.ConfidenceScore = {
      number: Math.round(data.confidence_score * 100) / 100
    };
  }
  
  // TopicsOfInterest - Multi-select from array of objects
  if (Array.isArray(data.topics_of_interest) && data.topics_of_interest.length > 0) {
    const topics = extractSimpleArray(data.topics_of_interest, 'topic', 50);
    if (topics.length > 0) {
      properties.TopicsOfInterest = {
        multi_select: topics.map(name => ({ name }))
      };
    }
  }
  
  // KeySkills - Multi-select from array of objects
  if (Array.isArray(data.key_skills) && data.key_skills.length > 0) {
    const skills = extractSimpleArray(data.key_skills, 'skill', 50);
    if (skills.length > 0) {
      properties.KeySkills = {
        multi_select: skills.map(name => ({ name }))
      };
    }
  }
  
  // ProjectInterests - Multi-select from array of objects
  if (Array.isArray(data.project_interests) && data.project_interests.length > 0) {
    const projects = extractSimpleArray(data.project_interests, 'project_type', 50);
    if (projects.length > 0) {
      properties.ProjectInterests = {
        multi_select: projects.map(name => ({ name }))
      };
    }
  }
  
  // Metadata fields
  if (data.metadata) {
    // Total Messages - Number
    if (typeof data.metadata.total_messages === 'number') {
      properties.TotalMessages = {
        number: data.metadata.total_messages
      };
    }
    
    // Conversation Duration - Number
    if (typeof data.metadata.conversation_duration_minutes === 'number') {
      properties.ConversationDuration = {
        number: data.metadata.conversation_duration_minutes
      };
    }
    
    // Model Version - Select
    if (data.metadata.model_version) {
      properties.ModelVersion = {
        select: { name: String(data.metadata.model_version).slice(0, 100) }
      };
    }
  }
  
  // Tags from notion_metadata
  if (data.notion_metadata && Array.isArray(data.notion_metadata.tags)) {
    properties.Tags = {
      multi_select: data.notion_metadata.tags.slice(0, 50).map(tag => ({ 
        name: String(tag).slice(0, 100) 
      }))
    };
  }
  
  // Category from notion_metadata
  if (data.notion_metadata && data.notion_metadata.category) {
    properties.Category = {
      select: { name: String(data.notion_metadata.category).slice(0, 100) }
    };
  }
  
  // Priority from notion_metadata
  if (data.notion_metadata && data.notion_metadata.priority) {
    properties.Priority = {
      select: { name: String(data.notion_metadata.priority).slice(0, 100) }
    };
  }
  
  // GitHubSource - Rich text (for tracking)
  const githubSource = `HaolongChen/chatgpt-notion-sync`;
  properties.GitHubSource = {
    rich_text: [{ text: { content: githubSource } }]
  };
  
  logger.debug('Transformed data to Notion properties', { 
    conversationId: data.conversation_id,
    propertyCount: Object.keys(properties).length 
  });
  
  return properties;
}

// ============================================================================
// NOTION API OPERATIONS - ENHANCED ERROR HANDLING
// ============================================================================

async function findExistingPage(conversationId) {
  try {
    const response = await notionClient.databases.query({
      database_id: CONFIG.NOTION_DATABASE_ID,
      filter: {
        property: 'ConversationID',
        title: {
          equals: conversationId
        }
      }
    });
    
    if (response.results.length > 0) {
      logger.debug('Found existing page', { 
        conversationId, 
        pageId: response.results[0].id,
        count: response.results.length 
      });
      return response.results[0].id;
    }
    
    logger.debug('No existing page found', { conversationId });
    return null;
  } catch (error) {
    logger.error('Error finding existing page', { 
      conversationId, 
      error: error.message,
      code: error.code,
      status: error.status 
    });
    throw error;
  }
}

async function createNotionPage(properties, retryCount = 0) {
  try {
    const response = await notionClient.pages.create({
      parent: { database_id: CONFIG.NOTION_DATABASE_ID },
      properties
    });
    
    logger.info('Created Notion page', { 
      pageId: response.id, 
      conversationId: properties.ConversationID?.title[0]?.text?.content,
      url: response.url 
    });
    
    return { success: true, pageId: response.id, action: 'created', url: response.url };
  } catch (error) {
    // Enhanced error logging
    logger.error('Error creating Notion page', {
      error: error.message,
      code: error.code,
      status: error.status,
      body: error.body,
      attempt: retryCount + 1
    });
    
    if (retryCount < CONFIG.MAX_RETRIES && isRetryableError(error)) {
      logger.warn('Retrying create operation', { 
        attempt: retryCount + 1, 
        maxRetries: CONFIG.MAX_RETRIES,
        error: error.message 
      });
      await sleep(CONFIG.RETRY_DELAY_MS * (retryCount + 1));
      return createNotionPage(properties, retryCount + 1);
    }
    
    throw error;
  }
}

async function updateNotionPage(pageId, properties, retryCount = 0) {
  try {
    const response = await notionClient.pages.update({
      page_id: pageId,
      properties
    });
    
    logger.info('Updated Notion page', { 
      pageId: response.id, 
      conversationId: properties.ConversationID?.title[0]?.text?.content,
      url: response.url 
    });
    
    return { success: true, pageId: response.id, action: 'updated', url: response.url };
  } catch (error) {
    // Enhanced error logging
    logger.error('Error updating Notion page', {
      pageId,
      error: error.message,
      code: error.code,
      status: error.status,
      body: error.body,
      attempt: retryCount + 1
    });
    
    if (retryCount < CONFIG.MAX_RETRIES && isRetryableError(error)) {
      logger.warn('Retrying update operation', { 
        attempt: retryCount + 1,
        maxRetries: CONFIG.MAX_RETRIES, 
        error: error.message 
      });
      await sleep(CONFIG.RETRY_DELAY_MS * (retryCount + 1));
      return updateNotionPage(pageId, properties, retryCount + 1);
    }
    
    throw error;
  }
}

async function syncToNotion(data) {
  const conversationId = data.conversation_id; // FIXED: Use snake_case
  
  if (!conversationId) {
    logger.error('Missing conversation_id in data', { data });
    return { 
      success: false, 
      error: 'Missing conversation_id', 
      conversationId: 'unknown' 
    };
  }
  
  try {
    const properties = transformToNotionProperties(data);
    const existingPageId = await findExistingPage(conversationId);
    
    if (existingPageId) {
      return await updateNotionPage(existingPageId, properties);
    } else {
      return await createNotionPage(properties);
    }
  } catch (error) {
    logger.error('Sync to Notion failed', { 
      conversationId, 
      error: error.message,
      stack: error.stack 
    });
    return { 
      success: false, 
      error: error.message, 
      conversationId 
    };
  }
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

async function readJsonFiles() {
  try {
    await fs.mkdir(CONFIG.DATA_DIR, { recursive: true });
    const files = await fs.readdir(CONFIG.DATA_DIR);
    const jsonFiles = files.filter(file => 
      file.endsWith('.json') && !file.startsWith('.')
    );
    
    logger.info('Found JSON files', { count: jsonFiles.length, files: jsonFiles });
    
    const dataObjects = [];
    
    for (const file of jsonFiles) {
      const filePath = path.join(CONFIG.DATA_DIR, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        // Handle both single objects and arrays
        if (Array.isArray(data)) {
          dataObjects.push(...data.map(item => ({ ...item, _sourceFile: file })));
        } else {
          dataObjects.push({ ...data, _sourceFile: file });
        }
        
        logger.debug('Loaded JSON file', { 
          file, 
          records: Array.isArray(data) ? data.length : 1 
        });
      } catch (error) {
        logger.error('Failed to read or parse JSON file', { 
          file, 
          error: error.message,
          stack: error.stack 
        });
      }
    }
    
    return dataObjects;
  } catch (error) {
    logger.error('Error reading data directory', { 
      directory: CONFIG.DATA_DIR,
      error: error.message 
    });
    throw error;
  }
}

// ============================================================================
// SYNC STATUS MANAGEMENT
// ============================================================================

async function loadSyncStatus() {
  try {
    const content = await fs.readFile(CONFIG.SYNC_STATUS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.info('No existing sync status found, creating new');
    return {
      lastSync: null,
      syncHistory: [],
      processedFiles: {}
    };
  }
}

async function saveSyncStatus(status) {
  try {
    await fs.mkdir(path.dirname(CONFIG.SYNC_STATUS_FILE), { recursive: true });
    await fs.writeFile(
      CONFIG.SYNC_STATUS_FILE, 
      JSON.stringify(status, null, 2), 
      'utf-8'
    );
    logger.debug('Sync status saved');
  } catch (error) {
    logger.error('Failed to save sync status', { error: error.message });
  }
}

// ============================================================================
// BATCHING & RATE LIMITING
// ============================================================================

async function processBatch(items, syncStatus) {
  const results = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
    urls: []
  };
  
  for (let i = 0; i < items.length; i += CONFIG.BATCH_SIZE) {
    const batch = items.slice(i, i + CONFIG.BATCH_SIZE);
    const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(items.length / CONFIG.BATCH_SIZE);
    
    logger.info('Processing batch', { 
      batch: batchNumber, 
      total: totalBatches, 
      items: batch.length,
      progress: `${Math.round((i / items.length) * 100)}%`
    });
    
    const batchPromises = batch.map(item => syncToNotion(item));
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
      const item = batch[index];
      const conversationId = item.conversation_id || 'unknown';
      
      if (result.status === 'fulfilled' && result.value.success) {
        if (result.value.action === 'created') {
          results.created++;
        } else {
          results.updated++;
        }
        
        // Track URLs
        if (result.value.url) {
          results.urls.push({
            conversationId,
            notionUrl: result.value.url,
            chatgptUrl: generateChatGPTUrl(conversationId)
          });
        }
        
        // Track in sync status
        syncStatus.processedFiles[item._sourceFile] = {
          conversationId,
          lastSync: new Date().toISOString(),
          status: 'success',
          action: result.value.action
        };
      } else {
        results.failed++;
        const error = result.status === 'rejected' 
          ? result.reason.message 
          : result.value.error;
        
        results.errors.push({
          conversationId,
          file: item._sourceFile,
          error
        });
        
        syncStatus.processedFiles[item._sourceFile] = {
          conversationId,
          lastSync: new Date().toISOString(),
          status: 'failed',
          error
        };
      }
    });
    
    // Rate limiting: wait between batches
    if (i + CONFIG.BATCH_SIZE < items.length) {
      logger.debug('Waiting before next batch', { delayMs: CONFIG.BATCH_DELAY_MS });
      await sleep(CONFIG.BATCH_DELAY_MS);
    }
  }
  
  return results;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  const retryableCodes = ['rate_limited', 'internal_server_error', 'service_unavailable', 'conflict_error'];
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  
  return retryableCodes.includes(error.code) || 
         retryableStatuses.includes(error.status) ||
         (error.status >= 500 && error.status < 600);
}

async function ensureLogsDirectory() {
  const logsDir = path.dirname(CONFIG.LOG_FILE);
  await fs.mkdir(logsDir, { recursive: true });
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const startTime = Date.now();
  
  try {
    logger.info('=== Notion Sync Started ===');
    logger.info('Configuration', {
      dataDir: CONFIG.DATA_DIR,
      schemaFile: CONFIG.SCHEMA_FILE,
      batchSize: CONFIG.BATCH_SIZE,
      maxRetries: CONFIG.MAX_RETRIES
    });
    
    // Ensure logs directory exists
    await ensureLogsDirectory();
    
    // Initialize
    initializeNotionClient();
    const schema = await loadSchema();
    initializeValidator(schema);
    
    // Load sync status
    const syncStatus = await loadSyncStatus();
    
    // Read and validate data
    logger.info('Reading JSON files from data directory');
    const dataObjects = await readJsonFiles();
    
    if (dataObjects.length === 0) {
      logger.warn('No data found to sync');
      return;
    }
    
    logger.info('Validating data', { totalRecords: dataObjects.length });
    const validatedData = [];
    const validationErrors = [];
    
    for (const data of dataObjects) {
      const validation = validateData(data, data._sourceFile);
      
      if (validation.valid) {
        validatedData.push(data);
      } else {
        validationErrors.push({
          file: data._sourceFile,
          conversationId: data.conversation_id,
          errors: validation.errors
        });
      }
    }
    
    logger.info('Validation complete', {
      valid: validatedData.length,
      invalid: validationErrors.length
    });
    
    if (validationErrors.length > 0) {
      logger.warn('Validation errors found', { 
        count: validationErrors.length,
        errors: validationErrors 
      });
    }
    
    if (validatedData.length === 0) {
      logger.error('No valid data to sync');
      process.exit(1);
    }
    
    // Sync to Notion with batching
    logger.info('Starting sync to Notion', { records: validatedData.length });
    const results = await processBatch(validatedData, syncStatus);
    
    // Update sync status
    syncStatus.lastSync = new Date().toISOString();
    syncStatus.syncHistory.push({
      timestamp: new Date().toISOString(),
      totalRecords: dataObjects.length,
      validRecords: validatedData.length,
      created: results.created,
      updated: results.updated,
      failed: results.failed,
      duration: Date.now() - startTime
    });
    
    // Keep only last 50 sync history entries
    if (syncStatus.syncHistory.length > 50) {
      syncStatus.syncHistory = syncStatus.syncHistory.slice(-50);
    }
    
    await saveSyncStatus(syncStatus);
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('=== Sync Complete ===', {
      duration: `${duration}s`,
      totalRecords: dataObjects.length,
      validRecords: validatedData.length,
      created: results.created,
      updated: results.updated,
      failed: results.failed,
      successRate: `${Math.round((results.created + results.updated) / validatedData.length * 100)}%`
    });
    
    // Log URLs for easy access
    if (results.urls.length > 0) {
      logger.info('Synced conversation URLs', { urls: results.urls });
    }
    
    if (results.errors.length > 0) {
      logger.error('Sync errors', { 
        count: results.errors.length,
        errors: results.errors 
      });
    }
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    logger.error('Fatal error during sync', { 
      error: error.message, 
      stack: error.stack 
    });
    process.exit(1);
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  main,
  syncToNotion,
  transformToNotionProperties,
  validateData,
  initializeNotionClient,
  generateChatGPTUrl
};
