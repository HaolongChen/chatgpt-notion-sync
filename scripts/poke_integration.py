#!/usr/bin/env python3
"""
Poke Integration Script

Integrates Poke API client with the existing ChatGPT-Notion sync workflow.
This script reads processed insights from JSON files and sends them to Poke API.

Author: Haolong Chen
Created: December 2025
License: MIT
"""

import os
import sys
import json
import logging
import argparse
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from poke_api_client import PokeAPIClient, PokeAPIConfig


# ============================================================================
# CONFIGURATION
# ============================================================================

CONFIG = {
    'DATA_DIR': os.path.join(os.path.dirname(__file__), '..', 'data'),
    'SYNC_STATUS_FILE': os.path.join(os.path.dirname(__file__), '..', 'data', '.poke-sync-status.json'),
    'LOG_DIR': os.path.join(os.path.dirname(__file__), '..', 'logs'),
    'LOG_FILE': 'poke_integration.log',
}


# ============================================================================
# LOGGING SETUP
# ============================================================================

def setup_logging(log_level: str = 'INFO') -> logging.Logger:
    """
    Setup logging configuration
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        
    Returns:
        Configured logger instance
    """
    # Create logs directory if it doesn't exist
    os.makedirs(CONFIG['LOG_DIR'], exist_ok=True)
    
    logger = logging.getLogger('poke_integration')
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File handler
    file_handler = logging.FileHandler(
        os.path.join(CONFIG['LOG_DIR'], CONFIG['LOG_FILE'])
    )
    file_handler.setLevel(logging.DEBUG)
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)
    
    return logger


# ============================================================================
# DATA LOADING
# ============================================================================

def load_json_files(data_dir: str, logger: logging.Logger) -> List[Dict[str, Any]]:
    """
    Load all JSON files from data directory
    
    Args:
        data_dir: Path to data directory
        logger: Logger instance
        
    Returns:
        List of data objects from JSON files
    """
    data_path = Path(data_dir)
    
    if not data_path.exists():
        logger.warning(f"Data directory does not exist: {data_dir}")
        return []
    
    json_files = list(data_path.glob('*.json'))
    # Exclude hidden files and status files
    json_files = [f for f in json_files if not f.name.startswith('.')]
    
    logger.info(f"Found {len(json_files)} JSON files in {data_dir}")
    
    data_objects = []
    
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Handle both single objects and arrays
            if isinstance(data, list):
                for item in data:
                    item['_source_file'] = json_file.name
                    data_objects.append(item)
            else:
                data['_source_file'] = json_file.name
                data_objects.append(data)
            
            logger.debug(f"Loaded {json_file.name}: {len(data) if isinstance(data, list) else 1} record(s)")
        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON file {json_file.name}: {e}")
        except Exception as e:
            logger.error(f"Error loading file {json_file.name}: {e}")
    
    logger.info(f"Loaded {len(data_objects)} total records")
    return data_objects


# ============================================================================
# SYNC STATUS MANAGEMENT
# ============================================================================

def load_sync_status(status_file: str, logger: logging.Logger) -> Dict[str, Any]:
    """
    Load sync status from file
    
    Args:
        status_file: Path to status file
        logger: Logger instance
        
    Returns:
        Sync status dictionary
    """
    try:
        with open(status_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.info("No existing sync status found, creating new")
        return {
            'last_sync': None,
            'sync_history': [],
            'processed_conversations': {}
        }
    except Exception as e:
        logger.error(f"Error loading sync status: {e}")
        return {
            'last_sync': None,
            'sync_history': [],
            'processed_conversations': {}
        }


def save_sync_status(status: Dict[str, Any], status_file: str, logger: logging.Logger):
    """
    Save sync status to file
    
    Args:
        status: Sync status dictionary
        status_file: Path to status file
        logger: Logger instance
    """
    try:
        os.makedirs(os.path.dirname(status_file), exist_ok=True)
        with open(status_file, 'w', encoding='utf-8') as f:
            json.dump(status, f, indent=2)
        logger.debug("Sync status saved")
    except Exception as e:
        logger.error(f"Failed to save sync status: {e}")


# ============================================================================
# DATA PROCESSING
# ============================================================================

def filter_new_conversations(data_objects: List[Dict[str, Any]], 
                            sync_status: Dict[str, Any],
                            logger: logging.Logger,
                            force: bool = False) -> List[Dict[str, Any]]:
    """
    Filter out conversations that have already been synced
    
    Args:
        data_objects: List of data objects
        sync_status: Current sync status
        logger: Logger instance
        force: If True, sync all conversations regardless of status
        
    Returns:
        List of conversations to sync
    """
    if force:
        logger.info("Force mode enabled, syncing all conversations")
        return data_objects
    
    processed = sync_status.get('processed_conversations', {})
    new_conversations = []
    
    for data in data_objects:
        conv_id = data.get('conversation_id')
        if not conv_id:
            logger.warning(f"Skipping data without conversation_id from {data.get('_source_file')}")
            continue
        
        if conv_id not in processed or processed[conv_id].get('status') != 'success':
            new_conversations.append(data)
        else:
            logger.debug(f"Skipping already synced conversation: {conv_id}")
    
    logger.info(f"Found {len(new_conversations)} conversations to sync (out of {len(data_objects)} total)")
    return new_conversations


def transform_for_poke(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform data format for Poke API if needed
    
    Args:
        data: Original data object
        
    Returns:
        Transformed data object
    """
    # For now, pass through the data as-is
    # Add any necessary transformations here
    transformed = data.copy()
    
    # Remove internal fields
    transformed.pop('_source_file', None)
    
    # Add timestamp if not present
    if 'sent_to_poke_at' not in transformed:
        transformed['sent_to_poke_at'] = datetime.utcnow().isoformat()
    
    return transformed


# ============================================================================
# MAIN SYNC LOGIC
# ============================================================================

def sync_to_poke(data_objects: List[Dict[str, Any]], 
                 client: PokeAPIClient,
                 sync_status: Dict[str, Any],
                 logger: logging.Logger,
                 dry_run: bool = False) -> Dict[str, Any]:
    """
    Sync data objects to Poke API
    
    Args:
        data_objects: List of data objects to sync
        client: Poke API client instance
        sync_status: Current sync status
        logger: Logger instance
        dry_run: If True, don't actually send data
        
    Returns:
        Summary of sync results
    """
    results = {
        'total': len(data_objects),
        'successful': 0,
        'failed': 0,
        'skipped': 0,
        'errors': []
    }
    
    logger.info(f"Starting sync of {len(data_objects)} conversations to Poke API")
    
    if dry_run:
        logger.info("DRY RUN MODE - No data will be sent")
    
    for i, data in enumerate(data_objects, 1):
        conv_id = data.get('conversation_id', 'unknown')
        logger.info(f"Processing {i}/{len(data_objects)}: {conv_id}")
        
        try:
            # Transform data
            transformed_data = transform_for_poke(data)
            
            if dry_run:
                logger.info(f"[DRY RUN] Would send conversation {conv_id}")
                results['successful'] += 1
                continue
            
            # Send to Poke API
            response = client.send_insights(transformed_data, conv_id)
            
            if response.success:
                results['successful'] += 1
                logger.info(f"✅ Successfully sent {conv_id} (attempt {response.attempts})")
                
                # Update sync status
                sync_status['processed_conversations'][conv_id] = {
                    'status': 'success',
                    'last_sync': datetime.utcnow().isoformat(),
                    'attempts': response.attempts,
                    'source_file': data.get('_source_file')
                }
            else:
                results['failed'] += 1
                error_msg = f"Failed to send {conv_id}: {response.error}"
                logger.error(f"❌ {error_msg}")
                results['errors'].append({
                    'conversation_id': conv_id,
                    'error': response.error,
                    'attempts': response.attempts
                })
                
                # Update sync status
                sync_status['processed_conversations'][conv_id] = {
                    'status': 'failed',
                    'last_sync': datetime.utcnow().isoformat(),
                    'error': response.error,
                    'attempts': response.attempts,
                    'source_file': data.get('_source_file')
                }
        
        except Exception as e:
            results['failed'] += 1
            error_msg = f"Unexpected error processing {conv_id}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            results['errors'].append({
                'conversation_id': conv_id,
                'error': str(e)
            })
    
    # Update sync history
    sync_status['last_sync'] = datetime.utcnow().isoformat()
    sync_status['sync_history'].append({
        'timestamp': datetime.utcnow().isoformat(),
        'total': results['total'],
        'successful': results['successful'],
        'failed': results['failed'],
        'dry_run': dry_run
    })
    
    # Keep only last 50 sync history entries
    if len(sync_status['sync_history']) > 50:
        sync_status['sync_history'] = sync_status['sync_history'][-50:]
    
    return results


# ============================================================================
# CLI
# ============================================================================

def main():
    """
    Main entry point for Poke integration script
    """
    parser = argparse.ArgumentParser(
        description='Sync ChatGPT conversation insights to Poke API',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                          # Sync new conversations
  %(prog)s --force                  # Force sync all conversations
  %(prog)s --dry-run                # Preview what would be synced
  %(prog)s --data-dir ./custom      # Use custom data directory
  %(prog)s --log-level DEBUG        # Enable debug logging

Environment Variables:
  POKE_API_KEY                     # Required: Poke API key
  POKE_API_ENDPOINT                # Optional: Custom API endpoint
  POKE_MAX_RETRIES                 # Optional: Max retry attempts (default: 3)
  POKE_INITIAL_BACKOFF             # Optional: Initial backoff delay in seconds (default: 1.0)
        """
    )
    
    parser.add_argument(
        '--data-dir',
        default=CONFIG['DATA_DIR'],
        help='Directory containing JSON data files (default: ../data)'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Force sync all conversations, even if already synced'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview what would be synced without actually sending data'
    )
    parser.add_argument(
        '--log-level',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        default='INFO',
        help='Set logging level (default: INFO)'
    )
    
    args = parser.parse_args()
    
    # Setup logging
    logger = setup_logging(args.log_level)
    
    logger.info("=== Poke API Integration Started ===")
    logger.info(f"Data directory: {args.data_dir}")
    logger.info(f"Force mode: {args.force}")
    logger.info(f"Dry run: {args.dry_run}")
    
    try:
        # Load data
        data_objects = load_json_files(args.data_dir, logger)
        
        if not data_objects:
            logger.warning("No data found to sync")
            return 0
        
        # Load sync status
        sync_status = load_sync_status(CONFIG['SYNC_STATUS_FILE'], logger)
        
        # Filter new conversations
        conversations_to_sync = filter_new_conversations(
            data_objects, sync_status, logger, force=args.force
        )
        
        if not conversations_to_sync:
            logger.info("No new conversations to sync")
            return 0
        
        # Initialize Poke API client
        logger.info("Initializing Poke API client")
        client = PokeAPIClient.from_env(logger=logger)
        
        # Check API health
        if not args.dry_run:
            logger.info("Checking Poke API health...")
            if not client.health_check():
                logger.warning("Poke API health check failed, but continuing anyway")
        
        # Sync to Poke
        results = sync_to_poke(
            conversations_to_sync,
            client,
            sync_status,
            logger,
            dry_run=args.dry_run
        )
        
        # Save sync status
        if not args.dry_run:
            save_sync_status(sync_status, CONFIG['SYNC_STATUS_FILE'], logger)
        
        # Print summary
        logger.info("=== Sync Complete ===")
        logger.info(f"Total conversations: {results['total']}")
        logger.info(f"Successful: {results['successful']}")
        logger.info(f"Failed: {results['failed']}")
        
        if results['failed'] > 0:
            success_rate = (results['successful'] / results['total']) * 100
            logger.info(f"Success rate: {success_rate:.1f}%")
            logger.error(f"Encountered {len(results['errors'])} errors")
        
        # Cleanup
        client.close()
        
        # Exit with appropriate code
        return 1 if results['failed'] > 0 else 0
    
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        logger.error("Please ensure POKE_API_KEY is set as an environment variable or GitHub Secret")
        return 1
    
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        return 1


if __name__ == '__main__':
    sys.exit(main())
