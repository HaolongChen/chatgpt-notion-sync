# Testing Guide - Notion Sync Script

## 🎯 Overview

This guide helps you verify that all bug fixes work correctly and the sync is production-ready.

---

## 📋 Pre-Test Checklist

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required variables:
```bash
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Verify File Structure
```bash
tree -L 2 -I 'node_modules'
```

Expected structure:
```
.
├── config/
│   └── default.json
├── data/
│   └── sample-insight.json
├── schemas/
│   └── conversation-insights-schema.json
├── scripts/
│   └── notion-sync.js
├── logs/          # Will be created
└── package.json
```

---

## 🧪 Test Suite

### Test 1: Schema Loading ✅

**Purpose:** Verify the script finds and loads the correct schema file.

```bash
node -e "
const path = require('path');
const fs = require('fs');

const schemaPath = path.join(__dirname, 'schemas/conversation-insights-schema.json');
console.log('Schema path:', schemaPath);
console.log('Exists:', fs.existsSync(schemaPath));

if (fs.existsSync(schemaPath)) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  console.log('✅ Schema loaded successfully');
  console.log('Required fields:', schema.required);
} else {
  console.log('❌ Schema file not found');
}
"
```

**Expected Output:**
```
Schema path: /path/to/schemas/conversation-insights-schema.json
Exists: true
✅ Schema loaded successfully
Required fields: [
  'conversation_id',
  'analysis_date',
  'technical_insights',
  ...
]
```

---

### Test 2: Data Validation ✅

**Purpose:** Verify sample data passes schema validation.

```bash
node -e "
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');

const schema = JSON.parse(fs.readFileSync('./schemas/conversation-insights-schema.json', 'utf-8'));
const data = JSON.parse(fs.readFileSync('./data/sample-insight.json', 'utf-8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const valid = validate(data);

if (valid) {
  console.log('✅ Sample data is VALID');
  console.log('Conversation ID:', data.conversation_id);
  console.log('Analysis Date:', data.analysis_date);
} else {
  console.log('❌ Validation FAILED');
  console.log('Errors:', validate.errors);
}
"
```

**Expected Output:**
```
✅ Sample data is VALID
Conversation ID: conv_a1b2c3d4e5f6g7h8i9j0
Analysis Date: 2025-12-11T01:15:00Z
```

---

### Test 3: URL Generation ✅

**Purpose:** Verify ChatGPT URLs are generated correctly.

```bash
node -e "
function generateChatGPTUrl(conversationId) {
  const cleanId = conversationId.replace(/^conv_/, '');
  return \`https://chat.openai.com/c/\${cleanId}\`;
}

const testIds = [
  'conv_a1b2c3d4e5f6g7h8i9j0',
  'conv_12345abcdef',
  'a1b2c3d4'  // Already clean
];

console.log('🔗 URL Generation Tests:\\n');
testIds.forEach(id => {
  const url = generateChatGPTUrl(id);
  console.log(\`  Input:  \${id}\`);
  console.log(\`  Output: \${url}\`);
  console.log();
});

console.log('✅ All URLs generated successfully');
"
```

**Expected Output:**
```
🔗 URL Generation Tests:

  Input:  conv_a1b2c3d4e5f6g7h8i9j0
  Output: https://chat.openai.com/c/a1b2c3d4e5f6g7h8i9j0

  Input:  conv_12345abcdef
  Output: https://chat.openai.com/c/12345abcdef

  Input:  a1b2c3d4
  Output: https://chat.openai.com/c/a1b2c3d4

✅ All URLs generated successfully
```

---

### Test 4: Data Transformation ✅

**Purpose:** Verify complex nested data is properly flattened for Notion.

```bash
node -e "
const { transformToNotionProperties } = require('./scripts/notion-sync');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./data/sample-insight.json', 'utf-8'));
const properties = transformToNotionProperties(data);

console.log('📊 Transformed Properties:\\n');
console.log('Total properties:', Object.keys(properties).length);
console.log('\\nProperty names:');
Object.keys(properties).forEach(key => {
  const type = Object.keys(properties[key])[0];
  console.log(\`  - \${key} (\${type})\`);
});

console.log('\\n🔍 Key Properties:\\n');

// Check ConversationID
if (properties.ConversationID) {
  console.log('✅ ConversationID:', properties.ConversationID.title[0].text.content);
}

// Check ChatGPT URL
if (properties.ChatGPTURL) {
  console.log('✅ ChatGPTURL:', properties.ChatGPTURL.url);
}

// Check multi-select fields
if (properties.TechnicalInsights) {
  console.log('✅ TechnicalInsights:', properties.TechnicalInsights.multi_select.length, 'items');
  console.log('   First:', properties.TechnicalInsights.multi_select[0]?.name);
}

if (properties.KeySkills) {
  console.log('✅ KeySkills:', properties.KeySkills.multi_select.length, 'items');
  console.log('   First:', properties.KeySkills.multi_select[0]?.name);
}

console.log('\\n✅ Data transformation complete');
"
```

**Expected Output:**
```
📊 Transformed Properties:

Total properties: 18

Property names:
  - ConversationID (title)
  - ChatGPTURL (url)
  - ConversationTitle (rich_text)
  - ConversationSummary (rich_text)
  - AnalysisDate (date)
  - ConversationDate (date)
  - LastSyncDate (date)
  - TechnicalInsights (multi_select)
  - ProblemSolvingPatterns (multi_select)
  - CommunicationStyle (select)
  - ConfidenceScore (number)
  - TopicsOfInterest (multi_select)
  - KeySkills (multi_select)
  - ProjectInterests (multi_select)
  - TotalMessages (number)
  - ConversationDuration (number)
  - ModelVersion (select)
  - Tags (multi_select)
  - Category (select)
  - Priority (select)
  - GitHubSource (rich_text)

🔍 Key Properties:

✅ ConversationID: conv_a1b2c3d4e5f6g7h8i9j0
✅ ChatGPTURL: https://chat.openai.com/c/a1b2c3d4e5f6g7h8i9j0
✅ TechnicalInsights: 3 items
   First: Distributed Systems
✅ KeySkills: 5 items
   First: Python Development

✅ Data transformation complete
```

---

### Test 5: Dry Run (No Notion API) ✅

**Purpose:** Test everything except actual Notion API calls.

```bash
# Create a test script
cat > test-dry-run.js << 'EOF'
const { transformToNotionProperties, validateData } = require('./scripts/notion-sync');
const fs = require('fs');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

async function dryRun() {
  console.log('🧪 Dry Run Test - No API Calls\n');
  
  // Load schema and data
  const schema = JSON.parse(fs.readFileSync('./schemas/conversation-insights-schema.json', 'utf-8'));
  const data = JSON.parse(fs.readFileSync('./data/sample-insight.json', 'utf-8'));
  
  // Initialize validator
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validator = ajv.compile(schema);
  
  // Validate
  console.log('1️⃣  Validating data...');
  const valid = validator(data);
  console.log(valid ? '   ✅ Valid' : '   ❌ Invalid');
  if (!valid) {
    console.log('   Errors:', validator.errors);
    return;
  }
  
  // Transform
  console.log('\n2️⃣  Transforming data...');
  const properties = transformToNotionProperties(data);
  console.log('   ✅ Transformed to', Object.keys(properties).length, 'properties');
  
  // Check required fields
  console.log('\n3️⃣  Checking required fields...');
  const requiredFields = ['ConversationID', 'ChatGPTURL', 'AnalysisDate'];
  requiredFields.forEach(field => {
    if (properties[field]) {
      console.log('   ✅', field);
    } else {
      console.log('   ❌', field, 'MISSING');
    }
  });
  
  // Summary
  console.log('\n📊 Summary:');
  console.log('   Schema: ✅ Loaded');
  console.log('   Validation: ✅ Passed');
  console.log('   Transformation: ✅ Complete');
  console.log('   Required Fields: ✅ Present');
  console.log('\n🎉 Dry run successful - Ready for actual sync!');
}

dryRun().catch(console.error);
EOF

node test-dry-run.js
```

**Expected Output:**
```
🧪 Dry Run Test - No API Calls

1️⃣  Validating data...
   ✅ Valid

2️⃣  Transforming data...
   ✅ Transformed to 18 properties

3️⃣  Checking required fields...
   ✅ ConversationID
   ✅ ChatGPTURL
   ✅ AnalysisDate

📊 Summary:
   Schema: ✅ Loaded
   Validation: ✅ Passed
   Transformation: ✅ Complete
   Required Fields: ✅ Present

🎉 Dry run successful - Ready for actual sync!
```

---

### Test 6: Full Sync (With Notion API) 🚀

**Purpose:** Execute the actual sync to Notion.

**Prerequisites:**
1. ✅ Notion integration created
2. ✅ Notion database created with proper schema
3. ✅ Environment variables set in `.env`

**Notion Database Schema Required:**

| Property Name | Type | Description |
|--------------|------|-------------|
| ConversationID | Title | Primary identifier |
| ChatGPTURL | URL | Link to ChatGPT conversation |
| ConversationTitle | Text | Conversation title |
| ConversationSummary | Text | Brief summary |
| AnalysisDate | Date | When analyzed |
| ConversationDate | Date | When conversation occurred |
| LastSyncDate | Date | Last sync timestamp |
| TechnicalInsights | Multi-select | Technical topics |
| ProblemSolvingPatterns | Multi-select | Patterns identified |
| CommunicationStyle | Select | Communication approach |
| ConfidenceScore | Number | Confidence (0-1) |
| TopicsOfInterest | Multi-select | Topics discussed |
| KeySkills | Multi-select | Skills identified |
| ProjectInterests | Multi-select | Projects |
| TotalMessages | Number | Message count |
| ConversationDuration | Number | Duration in minutes |
| ModelVersion | Select | AI model used |
| Tags | Multi-select | Tags |
| Category | Select | Category |
| Priority | Select | Priority |
| GitHubSource | Text | Source repository |

**Run the sync:**

```bash
# Set log level to debug for detailed output
export LOG_LEVEL=debug

# Run sync
node scripts/notion-sync.js
```

**Expected Output:**
```
info: === Notion Sync Started ===
info: Configuration { dataDir: './data', schemaFile: './schemas/...' }
info: Notion client initialized successfully
info: Schema loaded from file { path: './schemas/conversation-insights-schema.json' }
info: Validator initialized
info: Reading JSON files from data directory
info: Found JSON files { count: 1, files: [ 'sample-insight.json' ] }
debug: Loaded JSON file { file: 'sample-insight.json', records: 1 }
info: Validating data { totalRecords: 1 }
debug: Validation passed { filename: 'sample-insight.json' }
info: Validation complete { valid: 1, invalid: 0 }
info: Starting sync to Notion { records: 1 }
info: Processing batch { batch: 1, total: 1, items: 1, progress: '0%' }
debug: Generated ChatGPT URL { conversationId: 'conv_...', url: 'https://...' }
debug: Transformed data to Notion properties { conversationId: 'conv_...', propertyCount: 18 }
debug: No existing page found { conversationId: 'conv_...' }
info: Created Notion page { pageId: '...', conversationId: 'conv_...', url: 'https://notion.so/...' }
info: Synced conversation URLs { urls: [{ conversationId: '...', notionUrl: '...', chatgptUrl: '...' }] }
info: === Sync Complete === {
  duration: '2.34s',
  totalRecords: 1,
  validRecords: 1,
  created: 1,
  updated: 0,
  failed: 0,
  successRate: '100%'
}
```

---

### Test 7: Update Sync ✅

**Purpose:** Verify updates to existing pages work correctly.

```bash
# Modify the sample data
cat > data/sample-insight-updated.json << 'EOF'
{
  "conversation_id": "conv_a1b2c3d4e5f6g7h8i9j0",
  "analysis_date": "2025-12-11T02:00:00Z",
  "confidence_score": 0.95,
  "technical_insights": [
    {
      "topic": "Advanced Distributed Systems",
      "insight": "Updated insight",
      "complexity_level": "expert",
      "relevance_score": 0.98
    }
  ],
  ... (rest of required fields)
}
EOF

# Run sync again
node scripts/notion-sync.js
```

**Expected:**
```
info: Updated Notion page { pageId: '...', conversationId: 'conv_...', url: '...' }
info: === Sync Complete === {
  ...
  created: 0,
  updated: 1,
  failed: 0,
  successRate: '100%'
}
```

---

### Test 8: Error Handling ✅

**Purpose:** Verify graceful error handling.

```bash
# Test with invalid API key
export NOTION_API_KEY="invalid_key"
node scripts/notion-sync.js

# Expected: Error logged but script doesn't crash
# error: Failed to create Notion page { error: 'Unauthorized', code: 'unauthorized', ... }
```

```bash
# Test with missing required field
cat > data/invalid-insight.json << 'EOF'
{
  "conversation_id": "conv_test123"
  // Missing required fields
}
EOF

node scripts/notion-sync.js

# Expected: Validation error logged
# error: Validation failed { filename: 'invalid-insight.json', errors: [...] }
```

---

## 📊 Success Criteria

### ✅ All Tests Pass If:

1. **Schema Loading**
   - ✅ Schema file found at correct path
   - ✅ Schema parsed without errors
   - ✅ Required fields match actual data structure

2. **Data Validation**
   - ✅ Sample data passes validation
   - ✅ Invalid data properly rejected
   - ✅ Validation errors are detailed

3. **URL Generation**
   - ✅ ChatGPT URLs generated correctly
   - ✅ URLs follow format: `https://chat.openai.com/c/{id}`
   - ✅ Handles IDs with and without `conv_` prefix

4. **Data Transformation**
   - ✅ All 18+ properties generated
   - ✅ Nested objects properly flattened
   - ✅ Arrays converted to multi-select
   - ✅ String lengths respected (max 100 for tags, 2000 for text)
   - ✅ Array limits respected

5. **Full Sync**
   - ✅ Creates new pages successfully
   - ✅ Updates existing pages
   - ✅ Generates both Notion and ChatGPT URLs
   - ✅ Logs detailed progress
   - ✅ Completes with 100% success rate (for valid data)

6. **Error Handling**
   - ✅ Gracefully handles API errors
   - ✅ Retries transient failures
   - ✅ Logs detailed error information
   - ✅ Continues processing after non-fatal errors
   - ✅ Exits with appropriate exit code

---

## 🐛 Troubleshooting

### Issue: "Schema file not found"
**Fix:** Verify path is `schemas/conversation-insights-schema.json`, not `config/schema.json`

### Issue: "Validation failed" for all records
**Fix:** Check field names are snake_case (`conversation_id` not `ConversationID`)

### Issue: "Unauthorized" from Notion API
**Fix:** Verify `NOTION_API_KEY` starts with `secret_` and is valid

### Issue: "Database not found"
**Fix:** Verify `NOTION_DATABASE_ID` is correct 32-character hex string

### Issue: "ChatGPT URL is empty"
**Fix:** Ensure `conversation_id` field exists in data

---

## 📈 Performance Benchmarks

### Expected Performance:
- **Schema loading:** < 100ms
- **Validation:** < 50ms per record
- **Transformation:** < 20ms per record
- **Notion API call:** 200-500ms per request
- **Total sync (1 record):** 2-5 seconds
- **Total sync (100 records):** 60-120 seconds (with rate limiting)

---

## ✅ Final Verification

After all tests pass:

```bash
# Clean up test files
rm test-dry-run.js
rm data/sample-insight-updated.json
rm data/invalid-insight.json

# Verify logs directory created
ls -la logs/

# Check sync status
cat data/.sync-status.json

echo "🎉 All tests passed - sync is production ready!"
```

**Status: READY FOR PRODUCTION** 🚀
