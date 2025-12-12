# Quick Start Guide

Get up and running with ChatGPT-Notion Sync in minutes!

## Prerequisites Checklist

- [ ] Node.js v18.0.0+ installed
- [ ] npm v9.0.0+ installed
- [ ] Notion account with integration created
- [ ] Notion database created with required properties

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your keys
```

Required variables:
```env
NOTION_API_KEY=secret_xxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxx
```

### 3. Create Notion Database

Create a database in Notion with these properties:

| Property | Type | Required |
|----------|------|----------|
| ConversationID | Title | Yes |
| ConversationURL | URL | No |
| AnalysisDate | Date | Yes |
| LastSyncDate | Date | No |
| TechnicalInsights | Multi-select | No |
| ProblemSolvingPatterns | Multi-select | No |
| CommunicationStyle | Select | No |
| ConfidenceScore | Number | No |
| TopicsOfInterest | Multi-select | No |
| KeySkills | Multi-select | No |
| ProjectInterests | Multi-select | No |

### 4. Prepare Your Data

Option A: Use sample data (included)
```bash
# Sample file already in data/sample-conversation.json
npm start
```

Option B: Add your own data
```bash
# Copy your JSON files to data/ directory
cp your-data.json data/
npm start
```

### 5. Test the Sync

```bash
# Validate data without syncing
node src/index.js validate

# Dry run (see what would happen)
node src/index.js sync --dry-run

# Actually sync to Notion
npm start
```

## Common Issues

### "Missing required environment variables"

**Solution**: Make sure `.env` file exists and contains `NOTION_API_KEY` and `NOTION_DATABASE_ID`

```bash
# Check if .env exists
cat .env

# If not, copy from template
cp .env.example .env
```

### "No data files found"

**Solution**: Add JSON files to the `data/` directory

```bash
# Check data directory
ls data/

# Should see at least sample-conversation.json
```

### "Validation failed"

**Solution**: Check your data format matches the schema

```bash
# Validate to see specific errors
node src/index.js validate

# Use verbose mode for details
node src/index.js validate --verbose
```

### "Notion API error"

**Solution**: Check your API key and database ID

1. Verify API key in Notion integrations settings
2. Verify database ID from database URL
3. Make sure integration has access to the database

## Usage Examples

### Basic Sync
```bash
npm start
```

### Dry Run
```bash
npm run sync:dry-run
```

### Validate Only
```bash
node src/index.js validate
```

### Verbose Logging
```bash
node src/index.js sync --verbose
```

### Force Sync (Skip Validation)
```bash
node src/index.js sync --force
```

## Checking Results

### View Logs
```bash
# All logs
tail -f logs/app.log

# Errors only
tail -f logs/error.log
```

### Check Notion
1. Open your Notion database
2. Look for new pages with ConversationID titles
3. Check that properties are populated

## Next Steps

1. ✅ Verify sample data synced correctly
2. ✅ Add your own conversation data
3. ✅ Customize configuration in `config/default.json`
4. ✅ Set up scheduled syncs (optional)
5. ✅ Explore advanced features

## Need Help?

- Check the [README](README.md) for detailed documentation
- Review [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Open an issue on GitHub for support

## Quick Reference

### Commands
```bash
npm start              # Sync data to Notion
npm run sync:dry-run   # Test without syncing
npm run dev            # Run with auto-reload
npm test               # Run tests
npm run lint           # Check code style
```

### File Structure
```
.
├── data/              # Place JSON files here
├── config/            # Configuration files
├── schemas/           # Validation schemas
├── src/              # Source code
│   ├── services/     # Core services
│   └── utils/        # Utilities
├── logs/             # Log files (auto-created)
└── .env              # Environment variables
```

### Environment Variables
```env
# Required
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx

# Optional
LOG_LEVEL=info
SYNC_BATCH_SIZE=10
DRY_RUN=false
```

That's it! You should now have a working sync between ChatGPT data and Notion. 🎉
