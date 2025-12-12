/**
 * File Loader Service
 * 
 * Handles loading and parsing of data files from the file system.
 * Supports JSON files and handles both single objects and arrays.
 * 
 * @module services/fileLoader
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const { FileSystemError } = require('../utils/errors');

class FileLoader {
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(process.cwd(), 'data');
    this.fileExtensions = options.fileExtensions || ['.json'];
  }

  /**
   * Ensure data directory exists
   */
  async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      throw new FileSystemError(
        `Failed to create data directory: ${error.message}`,
        this.dataDir
      );
    }
  }

  /**
   * Get list of data files
   * @returns {Promise<Array<string>>} Array of file paths
   */
  async getDataFiles() {
    try {
      await this.ensureDataDir();
      const files = await fs.readdir(this.dataDir);

      // Filter for JSON files, exclude hidden files and sync status
      const dataFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return (
          this.fileExtensions.includes(ext) &&
          !file.startsWith('.') &&
          file !== 'sync-status.json'
        );
      });

      return dataFiles.map(file => path.join(this.dataDir, file));
    } catch (error) {
      throw new FileSystemError(
        `Failed to read data directory: ${error.message}`,
        this.dataDir
      );
    }
  }

  /**
   * Load a single JSON file
   * @param {string} filePath - Path to file
   * @returns {Promise<Object|Array>} Parsed data
   */
  async loadFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      logger.debug('Loaded file', {
        file: path.basename(filePath),
        type: Array.isArray(data) ? 'array' : 'object',
        count: Array.isArray(data) ? data.length : 1,
      });

      return data;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new FileSystemError(
          `Invalid JSON in file: ${error.message}`,
          filePath
        );
      }
      throw new FileSystemError(
        `Failed to read file: ${error.message}`,
        filePath
      );
    }
  }

  /**
   * Load all data files
   * @returns {Promise<Array<Object>>} Array of data objects
   */
  async loadAllFiles() {
    try {
      const filePaths = await this.getDataFiles();

      if (filePaths.length === 0) {
        logger.warn('No data files found', { dataDir: this.dataDir });
        return [];
      }

      logger.info('Found data files', { count: filePaths.length });

      const dataObjects = [];

      for (const filePath of filePaths) {
        try {
          const data = await this.loadFile(filePath);
          const fileName = path.basename(filePath);

          // Handle both single objects and arrays
          if (Array.isArray(data)) {
            data.forEach((item, index) => {
              dataObjects.push({
                ...item,
                _sourceFile: fileName,
                _sourceIndex: index,
              });
            });
          } else {
            dataObjects.push({
              ...data,
              _sourceFile: fileName,
            });
          }
        } catch (error) {
          logger.error('Failed to load file', {
            file: path.basename(filePath),
            error: error.message,
          });
          // Continue with other files
        }
      }

      logger.info('Loaded all files', { totalRecords: dataObjects.length });

      return dataObjects;
    } catch (error) {
      throw new FileSystemError(
        `Failed to load data files: ${error.message}`,
        this.dataDir
      );
    }
  }

  /**
   * Save data to a file
   * @param {string} fileName - File name
   * @param {Object|Array} data - Data to save
   */
  async saveFile(fileName, data) {
    try {
      await this.ensureDataDir();
      const filePath = path.join(this.dataDir, fileName);
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, content, 'utf-8');

      logger.info('Saved file', {
        file: fileName,
        size: content.length,
      });
    } catch (error) {
      throw new FileSystemError(
        `Failed to save file: ${error.message}`,
        fileName
      );
    }
  }
}

module.exports = { FileLoader };
