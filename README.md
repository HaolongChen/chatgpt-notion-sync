# ChatGPT-Notion Sync

Automated sync system for ChatGPT conversation analysis data to Notion databases

## 📋 Project Description

ChatGPT-Notion Sync is an automated synchronization tool that bridges ChatGPT conversation data with Notion databases. This system allows you to seamlessly export, analyze, and organize your ChatGPT conversations directly into your Notion workspace for better knowledge management, tracking, and insights.

### Key Features

- 🔄 Automated sync of ChatGPT conversations to Notion
- 📊 Conversation analysis and metadata extraction
- 🏷️ Automatic categorization and tagging
- 🔍 Full-text search capabilities in Notion
- 📅 Timestamped conversation history
- 🔐 Secure API integration with both platforms
- 🚀 **NEW: Poke API integration with robust retry logic**

### Use Cases

- Personal knowledge base management
- Team conversation tracking and collaboration
- Research and conversation analysis
- AI interaction documentation
- Learning and educational purposes
- **Data export to external analytics platforms via Poke API**

## 🚀 Setup Instructions

### Prerequisites

- Python 3.8 or higher
- Node.js 18.0 or higher
- ChatGPT account with API access
- Notion account with integration access
- Git (for cloning the repository)
- **Poke API key** (for Poke integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HaolongChen/chatgpt-notion-sync.git
   cd chatgpt-notion-sync
   ```

2. **Install dependencies**
   ```bash
   # Node.js dependencies
   npm install
   
   # Python dependencies (for Poke API integration)
   pip install requests
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   
   Add your API keys and configuration:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   NOTION_API_KEY=your_notion_integration_token_here
   NOTION_DATABASE_ID=your_notion_database_id_here
   POKE_API_KEY=your_poke_api_key_here
   ```

4. **Configure Notion Database**
   
   Create a Notion database with the following properties:
   - Title (Title)
   - Conversation ID (Text)
   - Date (Date)
   - Category (Select)
   - Tags (Multi-select)
   - Content (Text)
   - Analysis (Text)

5. **Run the sync**
   ```bash
   # Sync to Notion
   node scripts/notion-sync.js
   
   # Send to Poke API
   python scripts/poke_integration.py
   ```

## 📖 Usage

### Basic Sync
```bash
# Sync all new conversations to Notion
node scripts/notion-sync.js

# Sync to Poke API
python scripts/poke_integration.py

# Dry run (preview without sending)
python scripts/poke_integration.py --dry-run

# Force sync all conversations
python scripts/poke_integration.py --force
```

### Configuration Options

Edit `config/default.json` to customize:
- Sync frequency
- Filter criteria
- Analysis parameters
- Notion formatting preferences
- Retry logic parameters

## 🔌 Poke API Integration

The Poke API integration allows you to send processed insights to external analytics platforms.

### Features

✅ **Exponential Backoff Retry Logic**: Automatically retries failed requests with increasing delays  
✅ **Comprehensive Error Handling**: Handles network errors, rate limits, and API errors gracefully  
✅ **Configurable Parameters**: Customize API endpoint, retry attempts, timeouts, and more  
✅ **Detailed Logging**: Track all API interactions with comprehensive logs  
✅ **Batch Processing**: Send multiple conversations efficiently  
✅ **Sync Status Tracking**: Avoid duplicate sends with automatic status tracking  
✅ **GitHub Secrets Integration**: Secure API key management  

### Quick Start

1. **Set up your Poke API key**:
   ```bash
   export POKE_API_KEY="your_api_key_here"
   ```

2. **Send insights to Poke API**:
   ```bash
   python scripts/poke_integration.py
   ```

3. **Check logs**:
   ```bash
   cat logs/poke_api.log
   ```

### Configuration

Customize via environment variables:

```bash
# API Configuration
export POKE_API_ENDPOINT="https://api.poke.example.com/v1/insights"
export POKE_API_TIMEOUT=30

# Retry Configuration
export POKE_MAX_RETRIES=5
export POKE_INITIAL_BACKOFF=1.0
export POKE_MAX_BACKOFF=60.0
export POKE_BACKOFF_MULTIPLIER=2.0
```

For detailed documentation, see [docs/POKE_API_INTEGRATION.md](docs/POKE_API_INTEGRATION.md).

## 🔧 Configuration

Example `config/default.json`:
```json
{
  "sync": {
    "batchSize": 10,
    "intervalMs": 300000,
    "enableScheduledSync": false
  },
  "retry": {
    "maxAttempts": 3,
    "initialDelayMs": 1000,
    "maxDelayMs": 30000,
    "backoffMultiplier": 2
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Notion API Documentation](https://developers.notion.com)
- [Poke API Integration Documentation](docs/POKE_API_INTEGRATION.md)
- [Project Issues](https://github.com/HaolongChen/chatgpt-notion-sync/issues)

## ⚠️ Disclaimer

This tool is for personal and educational use. Please ensure you comply with OpenAI's, Notion's, and Poke's terms of service when using this integration.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Note**: This is an active development project. Features and setup instructions may change as the project evolves.
