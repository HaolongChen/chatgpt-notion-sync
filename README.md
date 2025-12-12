# ChatGPT-Notion Sync

Automated sync system for ChatGPT conversation analysis data to Notion databases

## 📋 Project Description

ChatGPT-Notion Sync is an automated synchronization tool built with **Node.js** that bridges ChatGPT conversation data with Notion databases. This system allows you to seamlessly export, analyze, and organize your ChatGPT conversations directly into your Notion workspace for better knowledge management, tracking, and insights.

### Key Features

- 🔄 **Automated Sync**: Seamlessly sync ChatGPT conversations to Notion
- 📊 **Data Analysis**: Extract insights, patterns, and metadata from conversations
- 🏷️ **Smart Categorization**: Automatic tagging and categorization
- 🔍 **Full-text Search**: Leverage Notion's search capabilities
- 📅 **Timestamped History**: Track conversation timeline
- 🔐 **Secure Integration**: Safe API integration with both platforms
- ⚡ **Rate Limiting**: Built-in rate limiting and retry logic
- 🛡️ **Data Validation**: JSON schema validation for data integrity
- 🔄 **Nested Object Support**: Properly handles complex data structures
- 🌐 **URL Generation**: Automatic ChatGPT conversation URL generation

### Use Cases

- Personal knowledge base management
- Team conversation tracking and collaboration
- Research and conversation analysis
- AI interaction documentation
- Learning and educational purposes
- Technical skill tracking
- Project interest monitoring

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- ChatGPT account (API access optional)
- Notion account with integration access
- Git (for cloning the repository)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HaolongChen/chatgpt-notion-sync.git
   cd chatgpt-notion-sync
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   # Required
   NOTION_API_KEY=your_notion_integration_token_here
   NOTION_DATABASE_ID=your_notion_database_id_here

   # Optional
   OPENAI_API_KEY=your_openai_api_key_here
   NODE_ENV=development
   LOG_LEVEL=info
   ```

4. **Configure Notion Database**
   
   Create a Notion database with the following properties:
   
   | Property Name | Type | Description |
   |--------------|------|-------------|
   | ConversationID | Title | Unique conversation identifier |
   | ConversationURL | URL | Link to ChatGPT conversation |
   | ConversationTitle | Rich Text | Conversation title |
   | ConversationSummary | Rich Text | Brief summary |
   | AnalysisDate | Date | When analysis was performed |
   | LastSyncDate | Date | Last sync timestamp |
   | TechnicalInsights | Multi-select | Technical topics and insights |
   | ProblemSolvingPatterns | Multi-select | Problem-solving approaches |
   | CommunicationStyle | Select | Communication style category |
   | ConfidenceScore | Number | Analysis confidence (0-1) |
   | TopicsOfInterest | Multi-select | Topics discussed |
   | KeySkills | Multi-select | Skills identified |
   | ProjectInterests | Multi-select | Projects mentioned |
   | GitHubSource | Rich Text | Source reference |

5. **Prepare your data**
   
   Place your ChatGPT conversation data JSON files in the `data/` directory.
   The data should follow the conversation insights schema (see `schemas/conversation-insights-schema.json`).

6. **Run the sync**
   ```bash
   npm start
   ```

## 📖 Usage

### Basic Sync

```bash
# Sync all data to Notion
npm start

# Or use the sync script directly
npm run sync
```

### Dry Run (Test Without Making Changes)

```bash
# See what would be synced without making changes
npm run sync:dry-run

# Or with the CLI
node src/index.js sync --dry-run
```

### Validate Data

```bash
# Validate data files without syncing
node src/index.js validate

# Or validate before syncing
node src/index.js sync --validate
```

### CLI Options

```bash
node src/index.js [command] [options]

Commands:
  sync              Sync ChatGPT data to Notion (default)
  validate          Validate data files without syncing
  help              Display help message

Options:
  --dry-run, -d     Run without making changes to Notion
  --validate, -v    Validate data before syncing
  --force, -f       Force sync even if validation fails
  --verbose         Enable verbose logging

Examples:
  npm start
  npm run sync:dry-run
  node src/index.js validate
  node src/index.js sync --dry-run --verbose
```

## 🔧 Configuration

### Configuration File

Edit `config/default.json` to customize:

```json
{
  "sync": {
    "batchSize": 10,
    "intervalMs": 300000,
    "enableScheduledSync": false,
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
    "maxDelayMs": 30000
  },
  "validation": {
    "strictMode": true,
    "validateBeforeSync": true
  }
}
```

### Environment Variables

Override configuration with environment variables:

```bash
# Sync Configuration
SYNC_BATCH_SIZE=10
DRY_RUN=false

# Logging
LOG_LEVEL=info  # debug, info, warn, error
LOG_FORMAT=json

# Rate Limiting
NOTION_RATE_LIMIT=3

# Retry Configuration
MAX_RETRY_ATTEMPTS=3
RETRY_INITIAL_DELAY_MS=1000
```

## 📊 Data Format

### Input Data Schema

Your JSON data should follow this structure (both snake_case and PascalCase are supported):

```json
{
  "conversation_id": "conv_abc123",
  "analysis_date": "2025-01-15T10:30:00Z",
  "conversation_title": "Building a REST API",
  "conversation_summary": "Discussion about API design...",
  "technical_insights": [
    {
      "topic": "API Design",
      "insight": "RESTful principles...",
      "complexity_level": "intermediate",
      "relevance_score": 0.9
    }
  ],
  "problem_solving_patterns": {
    "approach": "systematic",
    "thinking_style": "analytical",
    "patterns_identified": ["Breaking down complex problems"],
    "strengths": ["Clear articulation of requirements"]
  },
  "communication_style": {
    "clarity": "high",
    "technical_depth": "advanced",
    "question_quality": "excellent",
    "engagement_level": "highly engaged"
  },
  "key_skills": [
    {
      "skill": "JavaScript",
      "proficiency": "advanced",
      "evidence": "Demonstrated knowledge of async/await",
      "confidence": 0.85
    }
  ],
  "topics_of_interest": [
    {
      "topic": "Node.js",
      "frequency": 5,
      "depth": "deep"
    }
  ],
  "project_interests": [
    {
      "project_type": "API Development",
      "motivation": "Build scalable backend",
      "current_stage": "implementation"
    }
  ],
  "confidence_score": 0.87,
  "metadata": {
    "total_messages": 15,
    "conversation_duration_minutes": 45,
    "language": "en"
  },
  "validation": {
    "schema_version": "1.0.0",
    "validated_at": "2025-01-15T10:30:00Z",
    "validation_status": "passed"
  }
}
```

### Features of Data Transformer

- ✅ **Handles nested objects**: Automatically extracts data from complex structures
- ✅ **Case conversion**: Supports both snake_case and PascalCase field names
- ✅ **Array flattening**: Converts nested arrays into Notion-compatible formats
- ✅ **URL generation**: Automatically generates ChatGPT conversation URLs
- ✅ **Type conversion**: Properly converts data types for Notion properties
- ✅ **Truncation**: Automatically truncates long strings to fit Notion limits

## 🏗️ Project Structure

```
chatgpt-notion-sync/
├── src/
│   ├── index.js                    # Main entry point
│   ├── services/
│   │   ├── notionClient.js         # Notion API wrapper
│   │   ├── dataTransformer.js      # Data transformation logic
│   │   ├── chatgptService.js       # ChatGPT-specific operations
│   │   ├── syncOrchestrator.js     # Orchestrates sync process
│   │   └── fileLoader.js           # File loading utilities
│   └── utils/
│       ├── logger.js                # Logging setup
│       ├── validator.js             # Schema validation
│       ├── configLoader.js          # Configuration management
│       ├── errors.js                # Custom error classes
│       └── helpers.js               # Utility functions
├── config/
│   └── default.json                 # Default configuration
├── schemas/
│   └── conversation-insights-schema.json  # Data validation schema
├── scripts/
│   └── notion-sync.js               # Legacy sync script
├── data/                            # Place your JSON files here
├── logs/                            # Application logs
├── .env.example                     # Environment template
├── package.json                     # Dependencies and scripts
└── README.md                        # This file
```

## 🔍 Troubleshooting

### Common Issues

**1. "Missing required environment variables"**
```bash
# Make sure .env file exists and contains:
NOTION_API_KEY=...
NOTION_DATABASE_ID=...
```

**2. "Schema file not found"**
```bash
# Check that schemas/conversation-insights-schema.json exists
ls schemas/conversation-insights-schema.json
```

**3. "Validation failed"**
```bash
# Use --verbose to see detailed validation errors
node src/index.js sync --verbose

# Or validate first to see issues
node src/index.js validate

# Force sync anyway (not recommended)
node src/index.js sync --force
```

**4. "Rate limit exceeded"**
```bash
# Reduce batch size in config/default.json
{
  "sync": {
    "batchSize": 5  // Reduce from 10
  }
}
```

**5. "No data files found"**
```bash
# Make sure JSON files are in the data/ directory
ls data/

# Files should not start with . (hidden)
# File name examples: conversation-001.json, insights.json
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug node src/index.js sync --verbose
```

### Check Logs

```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log
```

## 🧪 Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# View test coverage
npm test -- --coverage
```

### Linting

```bash
# Check code style
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Development Mode

```bash
# Run with auto-reload
npm run dev
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Use meaningful commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Notion API Documentation](https://developers.notion.com)
- [Node.js Documentation](https://nodejs.org/docs)
- [Project Issues](https://github.com/HaolongChen/chatgpt-notion-sync/issues)

## ⚠️ Disclaimer

This tool is for personal and educational use. Please ensure you comply with OpenAI's and Notion's terms of service when using this integration.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Tech Stack**: Node.js, @notionhq/client, Winston, AJV, dotenv

**Author**: Haolong Chen

**Last Updated**: December 2025
