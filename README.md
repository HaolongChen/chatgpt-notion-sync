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

### Use Cases

- Personal knowledge base management
- Team conversation tracking and collaboration
- Research and conversation analysis
- AI interaction documentation
- Learning and educational purposes

## 🚀 Setup Instructions

### Prerequisites

- Python 3.8 or higher
- ChatGPT account with API access
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
   pip install -r requirements.txt
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
   python main.py
   ```

## 📖 Usage

### Basic Sync
```bash
# Sync all new conversations
python main.py --sync-all

# Sync conversations from a specific date
python main.py --from-date 2025-01-01

# Sync specific conversation by ID
python main.py --conversation-id <conv_id>
```

### Configuration Options

Edit `config.yaml` to customize:
- Sync frequency
- Filter criteria
- Analysis parameters
- Notion formatting preferences

## 🔧 Configuration

Example `config.yaml`:
```yaml
sync:
  interval: 3600  # Sync every hour
  batch_size: 50
  
filters:
  min_length: 100  # Minimum conversation length
  categories:
    - "technical"
    - "creative"
    - "research"

notion:
  page_format: "rich_text"
  include_metadata: true
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
- [Project Issues](https://github.com/HaolongChen/chatgpt-notion-sync/issues)

## ⚠️ Disclaimer

This tool is for personal and educational use. Please ensure you comply with OpenAI's and Notion's terms of service when using this integration.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Note**: This is an active development project. Features and setup instructions may change as the project evolves.