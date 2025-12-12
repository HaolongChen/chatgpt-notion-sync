# Quick Start - Get Sync Working in 5 Minutes

## 🚀 TL;DR

```bash
# 1. Clone and install
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your Notion credentials

# 3. Run sync
node scripts/notion-sync.js

# Done! ✨
```

---

## 📋 Prerequisites

- ✅ Node.js 18+ installed
- ✅ Notion account
- ✅ 5 minutes of your time

---

## 🔧 Step-by-Step Setup

### Step 1: Create Notion Integration (2 min)

1. Go to https://www.notion.so/my-integrations
2. Click **"New integration"**
3. Name it: `ChatGPT Sync`
4. Select your workspace
5. Click **"Submit"**
6. Copy the **Internal Integration Token** (starts with `secret_`)

### Step 2: Create Notion Database (2 min)

1. Create a new page in Notion
2. Add a **Database - Full page**
3. Name it: `ChatGPT Insights`
4. Add these properties:

#### Required Properties (click "+", select type):

| Property Name | Type | 
|--------------|------|
| ConversationID | Title |
| ChatGPTURL | URL |
| ConversationTitle | Text |
| ConversationSummary | Text |
| AnalysisDate | Date |
| ConversationDate | Date |
| LastSyncDate | Date |
| TechnicalInsights | Multi-select |
| ProblemSolvingPatterns | Multi-select |
| CommunicationStyle | Select |
| ConfidenceScore | Number |
| TopicsOfInterest | Multi-select |
| KeySkills | Multi-select |
| ProjectInterests | Multi-select |
| TotalMessages | Number |
| ConversationDuration | Number |
| ModelVersion | Select |
| Tags | Multi-select |
| Category | Select |
| Priority | Select |
| GitHubSource | Text |

5. Click **"..."** (top right) → **"Add connections"**
6. Select your integration: `ChatGPT Sync`
7. Copy the database ID from URL:
   ```
   https://notion.so/workspace/DATABASE_ID_HERE?v=...
                              ↑ Copy this part
   ```

### Step 3: Configure Environment (30 sec)

```bash
# Copy template
cp .env.example .env

# Edit .env
nano .env
```

Add your credentials:
```bash
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Install Dependencies (30 sec)

```bash
npm install
```

### Step 5: Run Sync! (5 sec)

```bash
node scripts/notion-sync.js
```

**Expected output:**
```
info: === Notion Sync Started ===
info: Schema loaded from file
info: Validating data { totalRecords: 1 }
info: Created Notion page { pageId: '...', url: '...' }
info: === Sync Complete === {
  duration: '2.34s',
  created: 1,
  updated: 0,
  failed: 0,
  successRate: '100%'
}
```

---

## ✅ Verify It Works

1. Open your Notion database
2. You should see 1 new row
3. Click the **ChatGPT URL** - should open the conversation
4. All fields should be populated

---

## 🎯 Next Steps

### Add Your Own Data

1. Export ChatGPT conversation data
2. Save as JSON in `data/` directory
3. Ensure it matches this structure:
   ```json
   {
     "conversation_id": "conv_xxxxx",
     "analysis_date": "2025-12-11T01:15:00Z",
     "technical_insights": [...],
     "key_skills": [...],
     ...
   }
   ```
4. Run sync again: `node scripts/notion-sync.js`

### Automate Syncing

```bash
# Add to crontab for daily sync at 2am
0 2 * * * cd /path/to/chatgpt-notion-sync && node scripts/notion-sync.js >> logs/cron.log 2>&1
```

### Monitor Logs

```bash
# Watch real-time logs
tail -f logs/sync.log

# Check errors only
tail -f logs/sync-error.log

# View sync history
cat data/.sync-status.json | jq '.syncHistory[-5:]'
```

---

## 🐛 Troubleshooting

### "NOTION_API_KEY is not set"
**Fix:** Check `.env` file exists and has correct format

### "Unauthorized" from Notion
**Fix:** 
1. Verify API key starts with `secret_`
2. Check integration is connected to database
3. Integration has read/write permissions

### "Database not found"
**Fix:**
1. Verify database ID is correct (32-character hex)
2. Database is shared with integration
3. Database exists in connected workspace

### "Validation failed"
**Fix:**
1. Check JSON files in `data/` directory
2. Ensure required fields exist: `conversation_id`, `analysis_date`
3. Run validation test: See `docs/TESTING_GUIDE.md`

### "No data found to sync"
**Fix:**
1. Add JSON files to `data/` directory
2. Files must end with `.json`
3. Files must not start with `.` (hidden files ignored)

---

## 📊 What Gets Synced?

From each conversation, the sync captures:

- 📝 **Conversation Details:** Title, summary, timestamp
- 🔗 **URLs:** Direct link to ChatGPT conversation
- 🧠 **Technical Insights:** Topics discussed, complexity level
- 🎯 **Problem Solving:** Approach, patterns, strengths
- 💬 **Communication:** Style, clarity, engagement level
- 🛠️ **Skills:** Identified skills with proficiency levels
- 📚 **Topics:** Areas of interest with depth metrics
- 🚀 **Projects:** Current interests and motivations
- 📈 **Metadata:** Message count, duration, model version
- 🏷️ **Organization:** Tags, category, priority

---

## 🔍 Data Flow

```
ChatGPT Conversation
      ↓
   [Export]
      ↓
JSON File in data/
      ↓
  [Validate]
      ↓
 [Transform]
      ↓
   Notion API
      ↓
 Database Entry ✨
```

---

## 💡 Pro Tips

### 1. Batch Processing
Place multiple JSON files in `data/` directory - all will sync in one run.

### 2. Check Before Sync
```bash
# Dry run validation
node -e "
const { validateData } = require('./scripts/notion-sync');
const data = require('./data/your-file.json');
console.log(validateData(data, 'your-file.json'));
"
```

### 3. Update Existing Records
If you sync the same `conversation_id` again, it **updates** the existing Notion page instead of creating a duplicate.

### 4. Detailed Logging
```bash
# Enable debug logs
LOG_LEVEL=debug node scripts/notion-sync.js
```

### 5. Rate Limiting
The script automatically batches requests (3 per second) to respect Notion's rate limits. For large datasets, expect ~1-2 seconds per conversation.

---

## 📚 Additional Resources

- **Full bug fixes:** `docs/BUG_FIXES.md`
- **Comprehensive testing:** `docs/TESTING_GUIDE.md`
- **Schema reference:** `schemas/conversation-insights-schema.json`
- **Sample data:** `data/sample-insight.json`

---

## 🎉 Success Checklist

After setup, you should have:

- ✅ Notion integration created
- ✅ Notion database with 21 properties
- ✅ Integration connected to database
- ✅ `.env` file with credentials
- ✅ Dependencies installed
- ✅ Sample data synced successfully
- ✅ ChatGPT URLs clickable in Notion
- ✅ All fields populated correctly

---

## 🤝 Need Help?

1. Check `docs/TESTING_GUIDE.md` for detailed tests
2. Review `docs/BUG_FIXES.md` for technical details
3. Enable debug logging: `LOG_LEVEL=debug`
4. Check logs in `logs/` directory
5. Verify sync status: `cat data/.sync-status.json`

---

**Happy Syncing! 🚀**

*Last updated: 2025-12-11*
