#!/usr/bin/env node

/**
 * Notion Sync Script
 * Syncs JSON data from /data directory to Notion database
 * Handles validation, transformation, batching, and error recovery
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
  SCHEMA_FILE: path.join(__dirname, '../config/schema.json'),
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
  required: ['ConversationID', 'AnalysisDate'],
  properties: {
    ConversationID: { type: 'string' },
    AnalysisDate: { type: 'string', format: 'date-time' },
    LastSyncDate: { type: 'string', format: 'date-time' },
    TechnicalInsights: { 
      type: 'array', 
      items: { type: 'string' },
      maxItems: 100
    },
    ProblemSolvingPatterns: { 
      type: 'array', 
      items: { type: 'string' },
      maxItems: 100
    },
    CommunicationStyle: { type: 'string' },
    ConfidenceScore: { 
      type: 'number', 
      minimum: 0, 
      maximum: 1 
    },
    TopicsOfInterest: { 
      type: 'array', 
      items: { type: 'string' },
      maxItems: 50
    },
    KeySkills: { 
      type: 'array', 
      items: { type: 'string' },
      maxItems: 50
    },
    ProjectInterests: { 
      type: 'array', 
      items: { type: 'string' },
      maxItems: 50
    },
    GitHubSource: { type: 'string' }
  },
  additionalProperties: true
};

let validator;

async function loadSchema() {
  try {
    const schemaContent = await fs.readFile(CONFIG.SCHEMA_FILE, 'utf-8');
    const schema = JSON.parse(schemaContent);
    logger.info('Schema loaded from file');
    return schema;
  } catch (error) {
    logger.warn('Schema file not found, using default schema', { error: error.message });
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
// DATA TRANSFORMATION
// ============================================================================

function transformToNotionProperties(data) {
  const properties = {};
  
  // ConversationID - Title property
  if (data.ConversationID) {
    properties.ConversationID = {
      title: [{ text: { content: String(data.ConversationID) } }]
    };
  }
  
  // AnalysisDate - Date property
  if (data.AnalysisDate) {
    properties.AnalysisDate = {
      date: { start: new Date(data.AnalysisDate).toISOString().split('T')[0] }
    };
  }
  
  // LastSyncDate - Date property
  properties.LastSyncDate = {
    date: { start: new Date().toISOString().split('T')[0] }
  };
  
  // TechnicalInsights - Multi-select property
  if (Array.isArray(data.TechnicalInsights) && data.TechnicalInsights.length > 0) {
    properties.TechnicalInsights = {
      multi_select: data.TechnicalInsights.slice(0, 100).map(item => ({ name: String(item).slice(0, 100) }))
    };
  }
  
  // ProblemSolvingPatterns - Multi-select property
  if (Array.isArray(data.ProblemSolvingPatterns) && data.ProblemSolvingPatterns.length > 0) {
    properties.ProblemSolvingPatterns = {
      multi_select: data.ProblemSolvingPatterns.slice(0, 100).map(item => ({ name: String(item).slice(0, 100) }))
    };
  }
  
  // CommunicationStyle - Select property
  if (data.CommunicationStyle) {
    properties.CommunicationStyle = {
      select: { name: String(data.CommunicationStyle).slice(0, 100) }
    };
  }
  
  // ConfidenceScore - Number property
  if (typeof data.ConfidenceScore === 'number') {
    properties.ConfidenceScore = {
      number: Math.round(data.ConfidenceScore * 100) / 100
    };
  }
  
  // TopicsOfInterest - Multi-select property
  if (Array.isArray(data.TopicsOfInterest) && data.TopicsOfInterest.length > 0) {
    properties.TopicsOfInterest = {
      multi_select: data.TopicsOfInterest.slice(0, 50).map(item => ({ name: String(item).slice(0, 100) }))
    };
  }
  
  // KeySkills - Multi-select property
  if (Array.isArray(data.KeySkills) && data.KeySkills.length > 0) {
    properties.KeySkills = {
      multi_select: data.KeySkills.slice(0, 50).map(item => ({ name: String(item).slice(0, 100) }))
    };
  }
  
  // ProjectInterests - Multi-select property
  if (Array.isArray(data.ProjectInterests) && data.ProjectInterests.length > 0) {
    properties.ProjectInterests = {
      multi_select: data.ProjectInterests.slice(0, 50).map(item => ({ name: String(item).slice(0, 100) }))
    };
  }
  
  // GitHubSource - Rich text property
  if (data.GitHubSource) {
    properties.GitHubSource = {
      rich_text: [{ text: { content: String(data.GitHubSource).slice(0, 2000) } }]
    };
  }
  
  return properties;
}

// ============================================================================
// NOTION API OPERATIONS
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
      logger.debug('Found existing page', { conversationId, pageId: response.results[0].id });
      return response.results[0].id;
    }
    
    return null;
  } catch (error) {
    logger.error('Error finding existing page', { conversationId, error: error.message });
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
      conversationId: properties.ConversationID?.title[0]?.text?.content 
    });
    
    return { success: true, pageId: response.id, action: 'created' };
  } catch (error) {
    if (retryCount < CONFIG.MAX_RETRIES && isRetryableError(error)) {
      logger.warn('Retrying create operation', { 
        attempt: retryCount + 1, 
        error: error.message 
      });
      await sleep(CONFIG.RETRY_DELAY_MS * (retryCount + 1));
      return createNotionPage(properties, retryCount + 1);
    }
    
    logger.error('Failed to create Notion page', { error: error.message, code: error.code });
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
      conversationId: properties.ConversationID?.title[0]?.text?.content 
    });
    
    return { success: true, pageId: response.id, action: 'updated' };
  } catch (error) {
    if (retryCount < CONFIG.MAX_RETRIES && isRetryableError(error)) {
      logger.warn('Retrying update operation', { 
        attempt: retryCount + 1, 
        error: error.message 
      });
      await sleep(CONFIG.RETRY_DELAY_MS * (retryCount + 1));
      return updateNotionPage(pageId, properties, retryCount + 1);
    }
    
    logger.error('Failed to update Notion page', { pageId, error: error.message, code: error.code });
    throw error;
  }
}

async function syncToNotion(data) {
  const conversationId = data.ConversationID;
  const properties = transformToNotionProperties(data);
  
  try {
    const existingPageId = await findExistingPage(conversationId);
    
    if (existingPageId) {
      return await updateNotionPage(existingPageId, properties);
    } else {
      return await createNotionPage(properties);
    }
  } catch (error) {
    logger.error('Sync to Notion failed', { conversationId, error: error.message });
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
        
        logger.debug('Loaded JSON file', { file, records: Array.isArray(data) ? data.length : 1 });
      } catch (error) {
        logger.error('Failed to read or parse JSON file', { file, error: error.message });
      }
    }
    
    return dataObjects;
  } catch (error) {
    logger.error('Error reading data directory', { error: error.message });
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
    errors: []
  };
  
  for (let i = 0; i < items.length; i += CONFIG.BATCH_SIZE) {
    const batch = items.slice(i, i + CONFIG.BATCH_SIZE);
    const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(items.length / CONFIG.BATCH_SIZE);
    
    logger.info('Processing batch', { 
      batch: batchNumber, 
      total: totalBatches, 
      items: batch.length 
    });
    
    const batchPromises = batch.map(item => syncToNotion(item));
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
      const item = batch[index];
      
      if (result.status === 'fulfilled' && result.value.success) {
        if (result.value.action === 'created') {
          results.created++;
        } else {
          results.updated++;
        }
        
        // Track in sync status
        syncStatus.processedFiles[item._sourceFile] = {
          conversationId: item.ConversationID,
          lastSync: new Date().toISOString(),
          status: 'success'
        };
      } else {
        results.failed++;
        const error = result.status === 'rejected' 
          ? result.reason.message 
          : result.value.error;
        
        results.errors.push({
          conversationId: item.ConversationID,
          file: item._sourceFile,
          error
        });
        
        syncStatus.processedFiles[item._sourceFile] = {
          conversationId: item.ConversationID,
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
  const retryableCodes = ['rate_limited', 'internal_server_error', 'service_unavailable'];
  return retryableCodes.includes(error.code) || error.status >= 500;
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
          conversationId: data.ConversationID,
          errors: validation.errors
        });
      }
    }
    
    logger.info('Validation complete', {
      valid: validatedData.length,
      invalid: validationErrors.length
    });
    
    if (validationErrors.length > 0) {
      logger.warn('Validation errors found', { errors: validationErrors });
    }
    
    if (validatedData.length === 0) {
      logger.error('No valid data to sync');
      return;
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
      failed: results.failed
    });
    
    if (results.errors.length > 0) {
      logger.error('Sync errors', { errors: results.errors });
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
  initializeNotionClient
};
