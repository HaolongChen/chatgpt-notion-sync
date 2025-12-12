#!/usr/bin/env python3
"""
Poke API Client Module

This module provides integration with the Poke API endpoint for sending
processed ChatGPT conversation insights data. It includes:
- Robust error handling with exponential backoff retry logic
- Configurable API endpoints and retry parameters
- Comprehensive logging and monitoring
- GitHub Secrets integration for secure API key management

Author: Haolong Chen
Created: December 2025
License: MIT
"""

import os
import time
import logging
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry


# ============================================================================
# CONFIGURATION CLASSES
# ============================================================================

class RetryStrategy(Enum):
    """Retry strategy types"""
    EXPONENTIAL = "exponential"
    LINEAR = "linear"
    FIXED = "fixed"


@dataclass
class PokeAPIConfig:
    """
    Configuration for Poke API client
    
    Attributes:
        api_key: API key for authentication (from GitHub Secret POKE_API_KEY)
        api_endpoint: Base URL for Poke API endpoint
        timeout: Request timeout in seconds
        max_retries: Maximum number of retry attempts
        initial_backoff: Initial backoff delay in seconds
        max_backoff: Maximum backoff delay in seconds
        backoff_multiplier: Multiplier for exponential backoff
        retry_strategy: Strategy for retry delays
        retry_on_status: HTTP status codes to retry on
        verify_ssl: Whether to verify SSL certificates
    """
    api_key: str
    api_endpoint: str = "https://api.poke.example.com/v1/insights"
    timeout: int = 30
    max_retries: int = 3
    initial_backoff: float = 1.0
    max_backoff: float = 60.0
    backoff_multiplier: float = 2.0
    retry_strategy: RetryStrategy = RetryStrategy.EXPONENTIAL
    retry_on_status: List[int] = None
    verify_ssl: bool = True
    
    def __post_init__(self):
        """Initialize default retry status codes if not provided"""
        if self.retry_on_status is None:
            self.retry_on_status = [408, 429, 500, 502, 503, 504]
    
    @classmethod
    def from_env(cls, **overrides) -> 'PokeAPIConfig':
        """
        Create configuration from environment variables
        
        Args:
            **overrides: Override specific configuration values
            
        Returns:
            PokeAPIConfig instance
            
        Raises:
            ValueError: If required environment variables are missing
        """
        api_key = os.getenv('POKE_API_KEY')
        if not api_key:
            raise ValueError(
                "POKE_API_KEY environment variable is required. "
                "Please set it as a GitHub Secret or in your .env file."
            )
        
        config = {
            'api_key': api_key,
            'api_endpoint': os.getenv('POKE_API_ENDPOINT', cls.api_endpoint),
            'timeout': int(os.getenv('POKE_API_TIMEOUT', cls.timeout)),
            'max_retries': int(os.getenv('POKE_MAX_RETRIES', cls.max_retries)),
            'initial_backoff': float(os.getenv('POKE_INITIAL_BACKOFF', cls.initial_backoff)),
            'max_backoff': float(os.getenv('POKE_MAX_BACKOFF', cls.max_backoff)),
            'backoff_multiplier': float(os.getenv('POKE_BACKOFF_MULTIPLIER', cls.backoff_multiplier)),
        }
        
        # Apply overrides
        config.update(overrides)
        
        return cls(**config)


# ============================================================================
# POKE API CLIENT
# ============================================================================

class PokeAPIClient:
    """
    Client for interacting with Poke API
    
    This client handles:
    - Authentication with API key
    - Automatic retries with exponential backoff
    - Error handling and logging
    - Request/response validation
    
    Example:
        ```python
        # Initialize client from environment
        client = PokeAPIClient.from_env()
        
        # Send insights data
        data = {
            "conversation_id": "conv_123",
            "insights": {...}
        }
        response = client.send_insights(data)
        
        if response.success:
            print(f"Successfully sent data: {response.data}")
        else:
            print(f"Failed to send data: {response.error}")
        ```
    """
    
    def __init__(self, config: PokeAPIConfig, logger: Optional[logging.Logger] = None):
        """
        Initialize Poke API client
        
        Args:
            config: Configuration object
            logger: Optional logger instance (creates default if not provided)
        """
        self.config = config
        self.logger = logger or self._create_default_logger()
        self.session = self._create_session()
        
        self.logger.info(
            "Poke API client initialized",
            extra={
                "endpoint": config.api_endpoint,
                "max_retries": config.max_retries,
                "retry_strategy": config.retry_strategy.value
            }
        )
    
    @classmethod
    def from_env(cls, logger: Optional[logging.Logger] = None, **config_overrides) -> 'PokeAPIClient':
        """
        Create client from environment variables
        
        Args:
            logger: Optional logger instance
            **config_overrides: Override specific configuration values
            
        Returns:
            PokeAPIClient instance
        """
        config = PokeAPIConfig.from_env(**config_overrides)
        return cls(config, logger)
    
    def _create_default_logger(self) -> logging.Logger:
        """Create default logger with console and file handlers"""
        logger = logging.getLogger('poke_api_client')
        logger.setLevel(logging.INFO)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
        
        # File handler
        try:
            os.makedirs('logs', exist_ok=True)
            file_handler = logging.FileHandler('logs/poke_api.log')
            file_handler.setLevel(logging.DEBUG)
            file_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
        except Exception as e:
            logger.warning(f"Failed to create file handler: {e}")
        
        return logger
    
    def _create_session(self) -> requests.Session:
        """Create requests session with retry configuration"""
        session = requests.Session()
        
        # Configure retry strategy for urllib3
        retry_config = Retry(
            total=0,  # We handle retries manually for better control
            connect=2,  # Connection retries
            read=2,  # Read retries
            status_forcelist=self.config.retry_on_status,
            backoff_factor=0.3,
        )
        
        adapter = HTTPAdapter(max_retries=retry_config)
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        
        # Set default headers
        session.headers.update({
            'Authorization': f'Bearer {self.config.api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'chatgpt-notion-sync/1.0 (Poke API Client)',
            'Accept': 'application/json'
        })
        
        return session
    
    def _calculate_backoff(self, attempt: int) -> float:
        """
        Calculate backoff delay based on retry strategy
        
        Args:
            attempt: Current attempt number (0-indexed)
            
        Returns:
            Delay in seconds
        """
        if self.config.retry_strategy == RetryStrategy.EXPONENTIAL:
            delay = min(
                self.config.initial_backoff * (self.config.backoff_multiplier ** attempt),
                self.config.max_backoff
            )
        elif self.config.retry_strategy == RetryStrategy.LINEAR:
            delay = min(
                self.config.initial_backoff * (attempt + 1),
                self.config.max_backoff
            )
        else:  # FIXED
            delay = self.config.initial_backoff
        
        # Add jitter to prevent thundering herd
        import random
        jitter = random.uniform(0, delay * 0.1)
        return delay + jitter
    
    def _should_retry(self, attempt: int, status_code: Optional[int] = None, 
                     exception: Optional[Exception] = None) -> bool:
        """
        Determine if request should be retried
        
        Args:
            attempt: Current attempt number (0-indexed)
            status_code: HTTP status code (if available)
            exception: Exception that occurred (if any)
            
        Returns:
            True if should retry, False otherwise
        """
        if attempt >= self.config.max_retries:
            return False
        
        # Retry on specific status codes
        if status_code and status_code in self.config.retry_on_status:
            return True
        
        # Retry on connection errors
        if exception and isinstance(exception, (requests.ConnectionError, 
                                               requests.Timeout)):
            return True
        
        return False
    
    def send_insights(self, data: Dict[str, Any], 
                     conversation_id: Optional[str] = None) -> 'APIResponse':
        """
        Send conversation insights to Poke API
        
        Args:
            data: Insights data to send
            conversation_id: Optional conversation ID for tracking
            
        Returns:
            APIResponse object with results
        """
        attempt = 0
        last_exception = None
        
        # Extract conversation_id if not provided
        if not conversation_id:
            conversation_id = data.get('conversation_id', 'unknown')
        
        self.logger.info(
            f"Sending insights to Poke API",
            extra={"conversation_id": conversation_id}
        )
        
        while attempt <= self.config.max_retries:
            try:
                # Make the request
                response = self.session.post(
                    self.config.api_endpoint,
                    json=data,
                    timeout=self.config.timeout,
                    verify=self.config.verify_ssl
                )
                
                # Success case
                if response.status_code == 200 or response.status_code == 201:
                    self.logger.info(
                        f"Successfully sent insights to Poke API",
                        extra={
                            "conversation_id": conversation_id,
                            "status_code": response.status_code,
                            "attempt": attempt + 1
                        }
                    )
                    return APIResponse(
                        success=True,
                        status_code=response.status_code,
                        data=response.json() if response.text else {},
                        conversation_id=conversation_id,
                        attempts=attempt + 1
                    )
                
                # Handle retryable errors
                if self._should_retry(attempt, response.status_code):
                    delay = self._calculate_backoff(attempt)
                    self.logger.warning(
                        f"Request failed with status {response.status_code}, retrying in {delay:.2f}s",
                        extra={
                            "conversation_id": conversation_id,
                            "status_code": response.status_code,
                            "attempt": attempt + 1,
                            "max_retries": self.config.max_retries,
                            "delay": delay
                        }
                    )
                    time.sleep(delay)
                    attempt += 1
                    continue
                
                # Non-retryable error
                error_msg = f"Request failed with status {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f": {error_data.get('error', error_data)}"
                except:
                    error_msg += f": {response.text[:200]}"
                
                self.logger.error(
                    error_msg,
                    extra={
                        "conversation_id": conversation_id,
                        "status_code": response.status_code,
                        "attempt": attempt + 1
                    }
                )
                
                return APIResponse(
                    success=False,
                    status_code=response.status_code,
                    error=error_msg,
                    conversation_id=conversation_id,
                    attempts=attempt + 1
                )
            
            except (requests.ConnectionError, requests.Timeout) as e:
                last_exception = e
                
                if self._should_retry(attempt, exception=e):
                    delay = self._calculate_backoff(attempt)
                    self.logger.warning(
                        f"Connection error, retrying in {delay:.2f}s: {str(e)}",
                        extra={
                            "conversation_id": conversation_id,
                            "attempt": attempt + 1,
                            "max_retries": self.config.max_retries,
                            "delay": delay,
                            "error_type": type(e).__name__
                        }
                    )
                    time.sleep(delay)
                    attempt += 1
                    continue
                
                break
            
            except Exception as e:
                last_exception = e
                self.logger.error(
                    f"Unexpected error: {str(e)}",
                    extra={
                        "conversation_id": conversation_id,
                        "attempt": attempt + 1,
                        "error_type": type(e).__name__
                    },
                    exc_info=True
                )
                break
        
        # All retries exhausted
        error_msg = f"Failed after {attempt + 1} attempts"
        if last_exception:
            error_msg += f": {str(last_exception)}"
        
        self.logger.error(
            error_msg,
            extra={
                "conversation_id": conversation_id,
                "total_attempts": attempt + 1
            }
        )
        
        return APIResponse(
            success=False,
            error=error_msg,
            conversation_id=conversation_id,
            attempts=attempt + 1
        )
    
    def send_batch(self, items: List[Dict[str, Any]]) -> 'BatchAPIResponse':
        """
        Send multiple insights in batch
        
        Args:
            items: List of insights data to send
            
        Returns:
            BatchAPIResponse with results for all items
        """
        self.logger.info(f"Sending batch of {len(items)} items to Poke API")
        
        results = []
        for item in items:
            response = self.send_insights(item)
            results.append(response)
        
        successful = sum(1 for r in results if r.success)
        failed = len(results) - successful
        
        self.logger.info(
            f"Batch send complete: {successful} successful, {failed} failed",
            extra={
                "total": len(results),
                "successful": successful,
                "failed": failed
            }
        )
        
        return BatchAPIResponse(
            results=results,
            total=len(results),
            successful=successful,
            failed=failed
        )
    
    def health_check(self) -> bool:
        """
        Check if Poke API is accessible
        
        Returns:
            True if API is healthy, False otherwise
        """
        try:
            # Try to make a simple request to verify connectivity
            response = self.session.get(
                self.config.api_endpoint.replace('/insights', '/health'),
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            self.logger.error(f"Health check failed: {str(e)}")
            return False
    
    def close(self):
        """Close the session and cleanup resources"""
        if self.session:
            self.session.close()
            self.logger.info("Poke API client session closed")


# ============================================================================
# RESPONSE CLASSES
# ============================================================================

@dataclass
class APIResponse:
    """
    Response from Poke API for a single request
    
    Attributes:
        success: Whether the request was successful
        status_code: HTTP status code (if available)
        data: Response data (if successful)
        error: Error message (if failed)
        conversation_id: Conversation ID for tracking
        attempts: Number of attempts made
    """
    success: bool
    status_code: Optional[int] = None
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    conversation_id: Optional[str] = None
    attempts: int = 1
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert response to dictionary"""
        return {
            'success': self.success,
            'status_code': self.status_code,
            'data': self.data,
            'error': self.error,
            'conversation_id': self.conversation_id,
            'attempts': self.attempts
        }


@dataclass
class BatchAPIResponse:
    """
    Response from Poke API for a batch request
    
    Attributes:
        results: List of individual APIResponse objects
        total: Total number of items
        successful: Number of successful requests
        failed: Number of failed requests
    """
    results: List[APIResponse]
    total: int
    successful: int
    failed: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert batch response to dictionary"""
        return {
            'total': self.total,
            'successful': self.successful,
            'failed': self.failed,
            'results': [r.to_dict() for r in self.results]
        }
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage"""
        return (self.successful / self.total * 100) if self.total > 0 else 0.0


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def send_to_poke(data: Dict[str, Any], config: Optional[PokeAPIConfig] = None) -> APIResponse:
    """
    Convenience function to send data to Poke API
    
    Args:
        data: Insights data to send
        config: Optional configuration (uses environment if not provided)
        
    Returns:
        APIResponse object
    """
    if config:
        client = PokeAPIClient(config)
    else:
        client = PokeAPIClient.from_env()
    
    try:
        return client.send_insights(data)
    finally:
        client.close()


if __name__ == "__main__":
    # Example usage
    import sys
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Example data
    sample_data = {
        "conversation_id": "conv_example_123",
        "analysis_date": "2025-12-12T00:00:00Z",
        "conversation_title": "Example Conversation",
        "conversation_summary": "This is a test conversation",
        "technical_insights": [
            {"topic": "Python", "confidence": 0.9},
            {"topic": "API Integration", "confidence": 0.85}
        ],
        "confidence_score": 0.87
    }
    
    try:
        # Create client from environment
        client = PokeAPIClient.from_env()
        
        # Send data
        response = client.send_insights(sample_data)
        
        if response.success:
            print(f"✅ Success! Data sent to Poke API")
            print(f"   Response: {response.data}")
            print(f"   Attempts: {response.attempts}")
        else:
            print(f"❌ Failed to send data: {response.error}")
            print(f"   Attempts: {response.attempts}")
            sys.exit(1)
    
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        print("\nPlease set the POKE_API_KEY environment variable or GitHub Secret.")
        sys.exit(1)
    
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)
    
    finally:
        client.close()
