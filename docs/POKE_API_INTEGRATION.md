# Poke API Integration Documentation

This document provides comprehensive documentation for the Poke API integration module in the chatgpt-notion-sync project.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Configuration](#setup--configuration)
4. [Usage](#usage)
5. [API Reference](#api-reference)
6. [Error Handling & Retry Logic](#error-handling--retry-logic)
7. [Monitoring & Logging](#monitoring--logging)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

## Overview

The Poke API integration module enables seamless transmission of processed ChatGPT conversation insights to the Poke API endpoint. It provides:

- **Robust Error Handling**: Automatic retry logic with exponential backoff
- **Configurable Parameters**: Customizable API endpoints, retry strategies, and timeouts
- **Comprehensive Logging**: Detailed logs for debugging and monitoring
- **Secure Authentication**: GitHub Secrets integration for API key management
- **Batch Processing**: Efficient handling of multiple conversations

### Key Features

✅ Exponential backoff retry logic with configurable parameters  
✅ Support for multiple retry strategies (exponential, linear, fixed)  
✅ Comprehensive error handling for network issues and API errors  
✅ Detailed logging with both console and file outputs  
✅ Batch processing capabilities  
✅ Dry-run mode for testing  
✅ Sync status tracking to avoid duplicate sends  
✅ Health check functionality  

## Architecture

### Module Structure

```
scripts/
├── poke_api_client.py       # Core API client with retry logic
├── poke_integration.py      # Integration with existing workflow
docs/
└── POKE_API_INTEGRATION.md  # This documentation
```

### Component Responsibilities

#### `poke_api_client.py`
- **PokeAPIConfig**: Configuration management
- **PokeAPIClient**: HTTP client with retry logic
- **APIResponse**: Response data structures
- **RetryStrategy**: Retry strategy enumeration

#### `poke_integration.py`
- Data loading from JSON files
- Sync status management
- CLI interface
- Integration with existing workflow

### Data Flow

```
┌─────────────────┐
│  JSON Files     │
│  (data/*.json)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  poke_integration.py    │
│  - Load JSON files      │
│  - Filter new data      │
│  - Transform data       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  poke_api_client.py     │
│  - HTTP requests        │
│  - Retry logic          │
│  - Error handling       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│   Poke API      │
│   Endpoint      │
└─────────────────┘
```

## Setup & Configuration

### Prerequisites

- Python 3.8 or higher
- `requests` library
- Valid Poke API key

### Installation

1. **Install Python dependencies**:
   ```bash
   pip install requests
   ```

2. **Set up GitHub Secret** (Recommended for production):
   - Go to your repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `POKE_API_KEY`
   - Value: Your Poke API key
   - Click "Add secret"

3. **Or set environment variable** (For local development):
   ```bash
   # Linux/macOS
   export POKE_API_KEY="your_api_key_here"
   
   # Windows (PowerShell)
   $env:POKE_API_KEY="your_api_key_here"
   
   # Windows (Command Prompt)
   set POKE_API_KEY=your_api_key_here
   ```

4. **Add to .env file** (For local development):
   ```bash
   echo "POKE_API_KEY=your_api_key_here" >> .env
   ```

### Configuration Options

All configuration can be set via environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `POKE_API_KEY` | API key for authentication | - | ✅ Yes |
| `POKE_API_ENDPOINT` | Poke API endpoint URL | `https://api.poke.example.com/v1/insights` | No |
| `POKE_API_TIMEOUT` | Request timeout (seconds) | `30` | No |
| `POKE_MAX_RETRIES` | Maximum retry attempts | `3` | No |
| `POKE_INITIAL_BACKOFF` | Initial backoff delay (seconds) | `1.0` | No |
| `POKE_MAX_BACKOFF` | Maximum backoff delay (seconds) | `60.0` | No |
| `POKE_BACKOFF_MULTIPLIER` | Backoff multiplier for exponential strategy | `2.0` | No |

### Example Configuration

**Production (GitHub Actions)**:
```yaml
env:
  POKE_API_KEY: ${{ secrets.POKE_API_KEY }}
  POKE_API_ENDPOINT: https://api.poke.production.com/v1/insights
  POKE_MAX_RETRIES: 5
```

**Development (.env file)**:
```bash
POKE_API_KEY=dev_test_key_123
POKE_API_ENDPOINT=https://api.poke.dev.com/v1/insights
POKE_MAX_RETRIES=2
POKE_INITIAL_BACKOFF=0.5
```

## Usage

### Command Line Interface

The integration script provides a CLI for easy usage:

```bash
# Sync new conversations to Poke API
python scripts/poke_integration.py

# Force sync all conversations (even already synced)
python scripts/poke_integration.py --force

# Dry run to preview what would be synced
python scripts/poke_integration.py --dry-run

# Use custom data directory
python scripts/poke_integration.py --data-dir ./my-data

# Enable debug logging
python scripts/poke_integration.py --log-level DEBUG
```

### Programmatic Usage

#### Basic Example

```python
from poke_api_client import PokeAPIClient

# Initialize client from environment
client = PokeAPIClient.from_env()

# Send insights
data = {
    "conversation_id": "conv_123",
    "analysis_date": "2025-12-12T00:00:00Z",
    "conversation_title": "Example",
    "technical_insights": [...],
    "confidence_score": 0.87
}

response = client.send_insights(data)

if response.success:
    print(f"Success! Sent in {response.attempts} attempt(s)")
else:
    print(f"Failed: {response.error}")

client.close()
```

#### Advanced Example with Custom Configuration

```python
from poke_api_client import PokeAPIClient, PokeAPIConfig, RetryStrategy
import logging

# Setup custom logger
logger = logging.getLogger('my_app')
logger.setLevel(logging.DEBUG)

# Create custom configuration
config = PokeAPIConfig(
    api_key="your_api_key",
    api_endpoint="https://custom.api.com/v1/insights",
    max_retries=5,
    initial_backoff=2.0,
    max_backoff=120.0,
    retry_strategy=RetryStrategy.EXPONENTIAL,
    timeout=60
)

# Initialize client with custom config
client = PokeAPIClient(config, logger=logger)

# Send batch
items = [data1, data2, data3]
batch_response = client.send_batch(items)

print(f"Batch results: {batch_response.successful}/{batch_response.total} succeeded")
print(f"Success rate: {batch_response.success_rate:.1f}%")

client.close()
```

#### Integration with Existing Workflow

```python
import json
from poke_api_client import send_to_poke

# Load processed insights
with open('data/insights.json', 'r') as f:
    insights = json.load(f)

# Send to Poke API (uses environment config)
for insight in insights:
    response = send_to_poke(insight)
    if response.success:
        print(f"✅ Sent {insight['conversation_id']}")
    else:
        print(f"❌ Failed {insight['conversation_id']}: {response.error}")
```

## API Reference

### PokeAPIConfig

Configuration dataclass for the Poke API client.

**Attributes**:
- `api_key` (str): API key for authentication
- `api_endpoint` (str): Base URL for Poke API
- `timeout` (int): Request timeout in seconds
- `max_retries` (int): Maximum retry attempts
- `initial_backoff` (float): Initial backoff delay
- `max_backoff` (float): Maximum backoff delay
- `backoff_multiplier` (float): Exponential backoff multiplier
- `retry_strategy` (RetryStrategy): Retry strategy type
- `retry_on_status` (List[int]): HTTP status codes to retry
- `verify_ssl` (bool): SSL certificate verification

**Methods**:
- `from_env(**overrides)`: Create config from environment variables

### PokeAPIClient

Main client class for Poke API interactions.

**Constructor**:
```python
PokeAPIClient(config: PokeAPIConfig, logger: Optional[logging.Logger] = None)
```

**Class Methods**:
- `from_env(logger=None, **config_overrides)`: Create client from environment

**Instance Methods**:

#### `send_insights(data, conversation_id=None)`
Send conversation insights to Poke API.

**Parameters**:
- `data` (Dict[str, Any]): Insights data to send
- `conversation_id` (Optional[str]): Conversation ID for tracking

**Returns**: `APIResponse`

#### `send_batch(items)`
Send multiple insights in batch.

**Parameters**:
- `items` (List[Dict[str, Any]]): List of insights to send

**Returns**: `BatchAPIResponse`

#### `health_check()`
Check if Poke API is accessible.

**Returns**: `bool`

#### `close()`
Close session and cleanup resources.

### APIResponse

Response dataclass for single API requests.

**Attributes**:
- `success` (bool): Whether request succeeded
- `status_code` (Optional[int]): HTTP status code
- `data` (Optional[Dict]): Response data
- `error` (Optional[str]): Error message
- `conversation_id` (Optional[str]): Conversation ID
- `attempts` (int): Number of attempts made

**Methods**:
- `to_dict()`: Convert to dictionary

### BatchAPIResponse

Response dataclass for batch requests.

**Attributes**:
- `results` (List[APIResponse]): Individual responses
- `total` (int): Total number of items
- `successful` (int): Number of successes
- `failed` (int): Number of failures

**Properties**:
- `success_rate` (float): Success percentage

**Methods**:
- `to_dict()`: Convert to dictionary

### RetryStrategy

Enum for retry strategies.

**Values**:
- `EXPONENTIAL`: Exponential backoff (2x each attempt)
- `LINEAR`: Linear backoff (1x each attempt)
- `FIXED`: Fixed delay between retries

### Convenience Functions

#### `send_to_poke(data, config=None)`
Convenience function to send data with automatic client management.

**Parameters**:
- `data` (Dict[str, Any]): Data to send
- `config` (Optional[PokeAPIConfig]): Custom config

**Returns**: `APIResponse`

## Error Handling & Retry Logic

### Retry Behavior

The client automatically retries failed requests based on:

1. **HTTP Status Codes**: Retries on 408, 429, 500, 502, 503, 504
2. **Network Errors**: Retries on connection errors and timeouts
3. **Max Retries**: Stops after configured maximum attempts

### Exponential Backoff

The exponential backoff algorithm:

```python
delay = min(
    initial_backoff * (multiplier ** attempt),
    max_backoff
) + jitter
```

**Example with default settings**:
- Attempt 1: ~1.0s delay
- Attempt 2: ~2.0s delay
- Attempt 3: ~4.0s delay
- Attempt 4: ~8.0s delay

### Error Types

| Error Type | Retryable | Description |
|------------|-----------|-------------|
| Rate Limit (429) | ✅ Yes | Too many requests |
| Server Error (5xx) | ✅ Yes | Server-side issues |
| Timeout | ✅ Yes | Request timeout |
| Connection Error | ✅ Yes | Network issues |
| Auth Error (401) | ❌ No | Invalid API key |
| Bad Request (400) | ❌ No | Invalid data format |
| Not Found (404) | ❌ No | Invalid endpoint |

### Customizing Retry Logic

```python
from poke_api_client import PokeAPIConfig, RetryStrategy

# Aggressive retry strategy
config = PokeAPIConfig(
    api_key="your_key",
    max_retries=5,
    initial_backoff=0.5,
    max_backoff=30.0,
    backoff_multiplier=1.5,
    retry_strategy=RetryStrategy.EXPONENTIAL
)

# Conservative retry strategy
config = PokeAPIConfig(
    api_key="your_key",
    max_retries=2,
    initial_backoff=2.0,
    max_backoff=10.0,
    retry_strategy=RetryStrategy.LINEAR
)
```

## Monitoring & Logging

### Log Levels

- **DEBUG**: Detailed diagnostic information
- **INFO**: General informational messages
- **WARNING**: Warning messages for non-critical issues
- **ERROR**: Error messages for failures

### Log Output

**Console Output**:
```
2025-12-12 00:05:30 - INFO - Poke API client initialized
2025-12-12 00:05:31 - INFO - Sending insights to Poke API
2025-12-12 00:05:32 - INFO - Successfully sent insights to Poke API
```

**File Output** (`logs/poke_api.log`):
```json
{
  "timestamp": "2025-12-12 00:05:32",
  "level": "INFO",
  "message": "Successfully sent insights to Poke API",
  "conversation_id": "conv_123",
  "status_code": 200,
  "attempt": 1
}
```

### Monitoring Metrics

The integration tracks:
- Total requests sent
- Success/failure counts
- Retry attempts per request
- Response times
- Error types and frequencies

### Sync Status Tracking

The integration maintains a `.poke-sync-status.json` file:

```json
{
  "last_sync": "2025-12-12T00:05:32Z",
  "sync_history": [
    {
      "timestamp": "2025-12-12T00:05:32Z",
      "total": 10,
      "successful": 9,
      "failed": 1
    }
  ],
  "processed_conversations": {
    "conv_123": {
      "status": "success",
      "last_sync": "2025-12-12T00:05:32Z",
      "attempts": 1
    }
  }
}
```

## Testing

### Unit Testing

Test the client with mock data:

```python
import unittest
from unittest.mock import Mock, patch
from poke_api_client import PokeAPIClient, PokeAPIConfig

class TestPokeAPIClient(unittest.TestCase):
    def setUp(self):
        self.config = PokeAPIConfig(api_key="test_key")
        self.client = PokeAPIClient(self.config)
    
    @patch('requests.Session.post')
    def test_successful_request(self, mock_post):
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success"}
        mock_post.return_value = mock_response
        
        # Test
        data = {"conversation_id": "test_123"}
        response = self.client.send_insights(data)
        
        # Assert
        self.assertTrue(response.success)
        self.assertEqual(response.status_code, 200)
```

### Integration Testing

```bash
# Test with dry-run mode
python scripts/poke_integration.py --dry-run --log-level DEBUG

# Test with actual API (dev environment)
POKE_API_ENDPOINT=https://api.poke.dev.com/v1/insights \
python scripts/poke_integration.py --data-dir ./test-data
```

### Manual Testing

```python
# Test basic connectivity
from poke_api_client import PokeAPIClient

client = PokeAPIClient.from_env()
if client.health_check():
    print("✅ API is accessible")
else:
    print("❌ API health check failed")

client.close()
```

## Troubleshooting

### Common Issues

#### 1. Missing API Key Error

**Error**: `ValueError: POKE_API_KEY environment variable is required`

**Solution**:
```bash
# Set environment variable
export POKE_API_KEY="your_api_key"

# Or add to .env file
echo "POKE_API_KEY=your_api_key" >> .env
```

#### 2. Connection Timeout

**Error**: `Failed after 3 attempts: Connection timeout`

**Solution**:
- Check network connectivity
- Verify API endpoint URL
- Increase timeout: `POKE_API_TIMEOUT=60`
- Check firewall settings

#### 3. Authentication Error

**Error**: `Request failed with status 401: Unauthorized`

**Solution**:
- Verify API key is correct
- Check if API key has expired
- Ensure API key has proper permissions

#### 4. Rate Limiting

**Error**: `Request failed with status 429: Too Many Requests`

**Solution**:
- Increase backoff delays: `POKE_INITIAL_BACKOFF=2.0`
- Reduce concurrent requests
- Implement batch processing with delays

#### 5. SSL Certificate Errors

**Error**: `SSL certificate verification failed`

**Solution**:
```python
# Disable SSL verification (not recommended for production)
config = PokeAPIConfig(
    api_key="your_key",
    verify_ssl=False
)
```

### Debug Mode

Enable detailed logging:

```bash
python scripts/poke_integration.py --log-level DEBUG
```

This will show:
- Request/response details
- Retry attempts and delays
- Full error stack traces
- Configuration values

### Getting Help

If you encounter issues:

1. Check the logs in `logs/poke_api.log`
2. Run with `--dry-run` to test without sending data
3. Use `--log-level DEBUG` for detailed output
4. Check sync status in `.poke-sync-status.json`
5. Open an issue on GitHub with logs and error messages

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit a pull request

### Development Setup

```bash
# Clone repository
git clone https://github.com/HaolongChen/chatgpt-notion-sync.git
cd chatgpt-notion-sync

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Run tests
python -m pytest tests/
```

### Code Style

Follow PEP 8 guidelines:
```bash
# Format code
black scripts/poke_*.py

# Check style
flake8 scripts/poke_*.py

# Type checking
mypy scripts/poke_*.py
```

---

## License

MIT License - see LICENSE file for details

## Support

For questions or issues, please open a GitHub issue or contact the maintainer.

---

**Last Updated**: December 12, 2025  
**Version**: 1.0.0  
**Maintainer**: Haolong Chen
