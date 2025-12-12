/**
 * Custom Error Classes
 * 
 * Defines custom error types for better error handling and debugging.
 * 
 * @module utils/errors
 */

/**
 * Base error class for application errors
 */
class AppError extends Error {
  constructor(message, code = 'APP_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 'VALIDATION_ERROR', { errors });
  }
}

/**
 * Configuration error
 */
class ConfigurationError extends AppError {
  constructor(message, missingKeys = []) {
    super(message, 'CONFIGURATION_ERROR', { missingKeys });
  }
}

/**
 * Notion API error
 */
class NotionApiError extends AppError {
  constructor(message, statusCode = null, notionCode = null) {
    super(message, 'NOTION_API_ERROR', { statusCode, notionCode });
    this.statusCode = statusCode;
    this.notionCode = notionCode;
  }

  isRetryable() {
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const retryableCodes = ['rate_limited', 'internal_server_error', 'service_unavailable'];
    
    return (
      retryableStatusCodes.includes(this.statusCode) ||
      retryableCodes.includes(this.notionCode)
    );
  }
}

/**
 * Data transformation error
 */
class TransformationError extends AppError {
  constructor(message, field = null) {
    super(message, 'TRANSFORMATION_ERROR', { field });
  }
}

/**
 * File system error
 */
class FileSystemError extends AppError {
  constructor(message, path = null) {
    super(message, 'FILE_SYSTEM_ERROR', { path });
  }
}

/**
 * Sync error
 */
class SyncError extends AppError {
  constructor(message, conversationId = null) {
    super(message, 'SYNC_ERROR', { conversationId });
  }
}

module.exports = {
  AppError,
  ValidationError,
  ConfigurationError,
  NotionApiError,
  TransformationError,
  FileSystemError,
  SyncError,
};
