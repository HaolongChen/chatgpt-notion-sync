#!/usr/bin/env node

/**
 * ChatGPT-Notion Sync - Main Entry Point
 * 
 * This is the main entry point for the ChatGPT-Notion sync application.
 * It orchestrates the entire data pipeline from ChatGPT data to Notion.
 * 
 * @module index
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const logger = require('./utils/logger');
const { loadConfig } = require('./utils/configLoader');
const { DataTransformer } = require('./services/dataTransformer');
const { NotionClient } = require('./services/notionClient');
const { ChatGPTService } = require('./services/chatgptService');
const { SyncOrchestrator } = require('./services/syncOrchestrator');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    command: args[0] || 'sync',
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    validate: args.includes('--validate') || args.includes('-v'),
    force: args.includes('--force') || args.includes('-f'),
    verbose: args.includes('--verbose'),
  };

  return options;
}

/**
 * Display usage information
 */
function displayUsage() {
  console.log(`
ChatGPT-Notion Sync - Usage:

Commands:
  sync              Sync ChatGPT data to Notion (default)
  validate          Validate data files without syncing
  help              Display this help message

Options:
  --dry-run, -d     Run without making changes to Notion
  --validate, -v    Validate data before syncing
  --force, -f       Force sync even if validation fails
  --verbose         Enable verbose logging

Examples:
  npm start sync
  npm run sync:dry-run
  node src/index.js validate
  node src/index.js sync --dry-run --verbose

Environment Variables:
  NOTION_API_KEY         Notion integration token (required)
  NOTION_DATABASE_ID     Notion database ID (required)
  OPENAI_API_KEY         OpenAI API key (optional)
  LOG_LEVEL              Logging level (default: info)
  NODE_ENV               Environment (development/production)

`);
}

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const required = ['NOTION_API_KEY', 'NOTION_DATABASE_ID'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing });
    logger.error('Please copy .env.example to .env and fill in the required values');
    return false;
  }

  return true;
}

/**
 * Main execution function
 */
async function main() {
  const startTime = Date.now();

  try {
    // Parse command line arguments
    const options = parseArgs();

    // Set log level if verbose
    if (options.verbose) {
      logger.level = 'debug';
    }

    // Display help if requested
    if (options.command === 'help') {
      displayUsage();
      process.exit(0);
    }

    logger.info('='.repeat(60));
    logger.info('ChatGPT-Notion Sync Started');
    logger.info('='.repeat(60));
    logger.info('Options', options);

    // Validate environment
    if (!validateEnvironment()) {
      process.exit(1);
    }

    // Load configuration
    const config = await loadConfig();
    logger.info('Configuration loaded successfully');

    // Initialize services
    const notionClient = new NotionClient(
      process.env.NOTION_API_KEY,
      process.env.NOTION_DATABASE_ID,
      config
    );

    const dataTransformer = new DataTransformer(config);
    const chatgptService = new ChatGPTService(config);

    // Initialize sync orchestrator
    const orchestrator = new SyncOrchestrator({
      notionClient,
      dataTransformer,
      chatgptService,
      config,
      logger,
    });

    // Execute command
    let result;
    switch (options.command) {
      case 'validate':
        logger.info('Running validation...');
        result = await orchestrator.validate();
        break;

      case 'sync':
      default:
        logger.info('Starting sync process...');
        result = await orchestrator.sync({
          dryRun: options.dryRun,
          validate: options.validate || !options.force,
          force: options.force,
        });
        break;
    }

    // Display results
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('='.repeat(60));
    logger.info('Sync Complete', {
      duration: `${duration}s`,
      ...result,
    });
    logger.info('='.repeat(60));

    // Exit with appropriate code
    const exitCode = result.failed > 0 ? 1 : 0;
    process.exit(exitCode);

  } catch (error) {
    logger.error('Fatal error during execution', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    promise,
  });
  process.exit(1);
});

// Handle termination signals
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT signal, shutting down gracefully');
  process.exit(0);
});

// Run main if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };
