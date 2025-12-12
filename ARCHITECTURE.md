# Architecture Documentation

## Overview

ChatGPT-Notion Sync is designed as a modular, extensible Node.js application that follows best practices for maintainability and scalability.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Input                           │
│                    (CLI / npm scripts)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      src/index.js                            │
│              (Main Entry Point & CLI Handler)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   SyncOrchestrator                           │
│              (Coordinates entire pipeline)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────────┐
    │   File   │   │   Data   │   │   ChatGPT    │
    │  Loader  │   │Validator │   │   Service    │
    └────┬─────┘   └────┬─────┘   └──────┬───────┘
         │              │                 │
         ▼              ▼                 ▼
    ┌────────────────────────────────────────────┐
    │         Data Transformation Layer          │
    │         (DataTransformer Service)          │
    └───────────────────┬────────────────────────┘
                        │
                        ▼
    ┌─────────────────────────────────────────────┐
    │           Notion Client Service              │
    │    (Rate Limiting + Retry + API Calls)       │
    └───────────────────┬─────────────────────────┘
                        │
                        ▼
    ┌─────────────────────────────────────────────┐
    │              Notion Database                 │
    └─────────────────────────────────────────────┘
```

## Core Components

### 1. Entry Point (`src/index.js`)

**Responsibility**: CLI interface and application initialization

**Key Features**:
- Command-line argument parsing
- Environment validation
- Service initialization
- Error handling and graceful shutdown

**Commands**:
- `sync` - Main synchronization command
- `validate` - Data validation only
- `help` - Display usage information

### 2. Sync Orchestrator (`src/services/syncOrchestrator.js`)

**Responsibility**: Coordinates the entire sync pipeline

**Flow**:
1. Initialize schema validator
2. Load data files
3. Validate data (optional)
4. Enrich with ChatGPT metadata
5. Transform to Notion format
6. Batch sync to Notion
7. Track results and errors

**Features**:
- Progress tracking
- Error aggregation
- Batch processing
- Dry-run support

### 3. File Loader (`src/services/fileLoader.js`)

**Responsibility**: Load and parse data files

**Capabilities**:
- Recursive directory scanning
- JSON parsing with error handling
- Array/object detection
- Source file tracking

**Supported Formats**:
- Single JSON objects
- Arrays of JSON objects
- Mixed formats in different files

### 4. Validator (`src/utils/validator.js`)

**Responsibility**: Data validation against JSON schemas

**Features**:
- Schema loading from file
- Multiple schema registration
- Batch validation
- Detailed error reporting

**Schema Support**:
- JSON Schema Draft 7
- Format validation (dates, URLs, etc.)
- Strict/loose modes

### 5. Data Transformer (`src/services/dataTransformer.js`)

**Responsibility**: Transform data to Notion-compatible format

**Transformations**:
- Field name normalization (snake_case ↔ PascalCase)
- Nested object extraction
- Array flattening
- Type conversion
- String truncation

**Property Mappings**:
```javascript
{
  conversation_id → ConversationID (Title)
  analysis_date → AnalysisDate (Date)
  technical_insights → TechnicalInsights (Multi-select)
  problem_solving_patterns → ProblemSolvingPatterns (Multi-select)
  communication_style → CommunicationStyle (Select)
  confidence_score → ConfidenceScore (Number)
  // ... and more
}
```

### 6. ChatGPT Service (`src/services/chatgptService.js`)

**Responsibility**: ChatGPT-specific operations

**Features**:
- Conversation URL generation
- Data enrichment
- ID validation
- Format parsing

**URL Format**: `https://chat.openai.com/c/{conversation_id}`

### 7. Notion Client (`src/services/notionClient.js`)

**Responsibility**: Interact with Notion API

**Features**:
- Rate limiting (3 req/sec)
- Automatic retries with exponential backoff
- Batch operations
- Error handling
- Find or create logic

**API Operations**:
- `findExistingPage()` - Search by ConversationID
- `createPage()` - Create new page
- `updatePage()` - Update existing page
- `syncRecord()` - Upsert operation
- `batchSync()` - Batch processing

### 8. Logger (`src/utils/logger.js`)

**Responsibility**: Application logging

**Outputs**:
- Console (colored, formatted)
- File: `logs/app.log` (all logs)
- File: `logs/error.log` (errors only)

**Levels**: debug, info, warn, error

**Features**:
- Timestamp
- Structured logging (JSON)
- Log rotation
- Custom log methods (success, progress)

### 9. Configuration Loader (`src/utils/configLoader.js`)

**Responsibility**: Load and merge configuration

**Sources** (in order of precedence):
1. Environment variables
2. Environment-specific config
3. Default config (`config/default.json`)

**Configuration Sections**:
- sync (batch size, intervals)
- rateLimit (API throttling)
- retry (error recovery)
- validation (schema options)
- logging (output config)

## Data Flow

### Sync Operation

```
1. User runs: npm start
   ↓
2. src/index.js parses args and initializes services
   ↓
3. SyncOrchestrator.sync() called
   ↓
4. FileLoader reads JSON files from data/
   ↓
5. Validator checks data against schema
   ↓
6. ChatGPTService enriches data (adds URLs, metadata)
   ↓
7. DataTransformer converts to Notion format
   ↓
8. NotionClient syncs in batches
   ↓
   For each record:
   ├─ Find existing page by ConversationID
   ├─ If exists: update page
   └─ If not: create new page
   ↓
9. Results aggregated and reported
   ↓
10. Logs written to files and console
```

### Validation Flow

```
1. User runs: node src/index.js validate
   ↓
2. SyncOrchestrator.validate() called
   ↓
3. FileLoader reads data files
   ↓
4. Validator checks each file
   ↓
5. Errors collected and reported
   ↓
6. Summary displayed (valid/invalid counts)
```

## Error Handling Strategy

### Custom Error Classes

```javascript
AppError               // Base error
├─ ValidationError     // Schema validation failed
├─ ConfigurationError  // Config missing/invalid
├─ NotionApiError      // Notion API issues
├─ TransformationError // Data transformation failed
├─ FileSystemError     // File operations failed
└─ SyncError           // Sync operation failed
```

### Retry Strategy

```javascript
{
  maxAttempts: 3,
  initialDelay: 1000ms,
  maxDelay: 30000ms,
  backoffMultiplier: 2,
  retryableErrors: [408, 429, 500, 502, 503, 504]
}
```

**Retry Schedule**:
- Attempt 1: immediate
- Attempt 2: after 1s
- Attempt 3: after 2s
- Attempt 4: after 4s
- (up to maxDelay)

## Rate Limiting

### Notion API Limits

- **Concurrent requests**: 3
- **Rate**: 3 requests/second
- **Implementation**: p-limit + delay between batches

### Strategy

```javascript
// Before each request
await applyRateLimit()  // Ensures min 333ms between requests

// Batch processing
for (batch of batches) {
  await Promise.allSettled(batch)  // Max 3 concurrent
  await sleep(1000)                // Wait between batches
}
```

## Configuration

### Default Configuration (`config/default.json`)

```json
{
  "sync": {
    "batchSize": 10,           // Records per batch
    "intervalMs": 300000,       // 5 minutes
    "dryRun": false
  },
  "rateLimit": {
    "notion": {
      "requestsPerSecond": 3,
      "maxConcurrent": 3
    }
  },
  "retry": {
    "maxAttempts": 3,
    "initialDelayMs": 1000,
    "maxDelayMs": 30000,
    "backoffMultiplier": 2
  }
}
```

### Environment Overrides

```env
SYNC_BATCH_SIZE=10
DRY_RUN=false
LOG_LEVEL=info
NOTION_RATE_LIMIT=3
MAX_RETRY_ATTEMPTS=3
```

## Extensibility

### Adding New Services

1. Create service in `src/services/`
2. Export class with constructor
3. Initialize in `src/index.js`
4. Pass to `SyncOrchestrator`

### Adding New Transformations

1. Add method to `DataTransformer`
2. Call from `transformToNotionProperties()`
3. Handle both naming conventions

### Adding New Validators

1. Create schema in `schemas/`
2. Register with `Validator`
3. Use in validation pipeline

## Performance Considerations

### Bottlenecks

1. **Notion API rate limit** - Main constraint (3 req/s)
2. **File I/O** - Usually fast, but can add up with many files
3. **Validation** - Minimal overhead with AJV

### Optimizations

1. **Batch processing** - Reduces overhead
2. **Concurrent requests** - Up to 3 at once
3. **Caching** - Find operations cached per batch
4. **Streaming** - Could be added for large files

### Scalability

**Current Capacity**:
- 3 requests/second = 180/minute = 10,800/hour
- With batches of 10: 1,080 records/hour

**To Scale Further**:
1. Use multiple Notion integrations (separate rate limits)
2. Implement queue system for large datasets
3. Add database for state management
4. Deploy as distributed service

## Testing Strategy

### Unit Tests
- Each service/utility tested independently
- Mocked dependencies
- Edge cases covered

### Integration Tests
- End-to-end flow with test database
- Real API calls (optional)
- Validation of results

### Test Data
- Sample files in `data/`
- Test schemas
- Mock responses

## Security

### API Keys
- Stored in `.env` (not committed)
- Validated on startup
- Never logged

### Data Validation
- All input validated against schema
- SQL injection N/A (Notion API)
- XSS N/A (server-side only)

### Dependencies
- Regular updates via Dependabot
- Security audits with `npm audit`
- Minimal dependency tree

## Monitoring

### Logs
- All operations logged
- Error details captured
- Performance metrics tracked

### Metrics (Optional)
- Sync duration
- Success/failure rates
- API latency
- Validation errors

## Future Enhancements

### Planned
1. Webhooks for real-time sync
2. Bi-directional sync (Notion → ChatGPT)
3. Advanced filtering
4. Custom field mappings
5. Multiple database support

### Under Consideration
1. Web UI
2. Scheduled syncs (cron)
3. Database caching
4. Incremental sync
5. Conflict resolution

## Contributing

See [README.md](README.md) for contribution guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
