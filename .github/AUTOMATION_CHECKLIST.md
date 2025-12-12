# 🤖 Automation Setup Checklist

Use this checklist to ensure your automated Notion sync is properly configured.

## ✅ Initial Setup

### 1. Notion Integration
- [ ] Created Notion integration at https://www.notion.so/my-integrations
- [ ] Copied integration token (starts with `secret_`)
- [ ] Saved token as `NOTION_API_KEY` secret in GitHub
- [ ] Created Notion database with required schema
- [ ] Connected integration to database (see WORKFLOW_SETUP.md)
- [ ] Tested integration access locally

### 2. GitHub Secrets
Go to: **Settings → Secrets and variables → Actions**

- [ ] Added `NOTION_API_KEY` secret
- [ ] Added `NOTION_DATABASE_ID` secret
- [ ] Verified secret names match exactly (case-sensitive)
- [ ] Optional: Added `SLACK_WEBHOOK_URL` for notifications

### 3. Repository Settings
- [ ] Enabled GitHub Actions in repository
- [ ] Workflow file exists at `.github/workflows/notion-sync.yml`
- [ ] Workflow is on `main` branch
- [ ] Actions have write permissions (for creating issues)

### 4. Data Preparation
- [ ] Sample JSON files exist in `/data` directory
- [ ] JSON files follow the schema in `/schemas`
- [ ] Data contains required fields: `ConversationID`, `AnalysisDate`
- [ ] No syntax errors in JSON files

## 🧪 Testing

### Local Testing
```bash
# Set environment variables
export NOTION_API_KEY="your_key"
export NOTION_DATABASE_ID="your_db_id"

# Install dependencies
npm install

# Run sync locally
node scripts/notion-sync.js

# Check logs
cat logs/sync.log
```

### GitHub Actions Testing
- [ ] Manually triggered workflow (Actions → Notion Sync Automation → Run workflow)
- [ ] Used dry-run mode first
- [ ] Verified workflow completed successfully
- [ ] Checked sync logs in artifacts
- [ ] Confirmed data appeared in Notion database
- [ ] Reviewed workflow summary report

## 🔍 Verification

### Database Schema Check
Your Notion database should have these properties:

| Property | Type | Status |
|----------|------|--------|
| ConversationID | Title | [ ] Verified |
| AnalysisDate | Date | [ ] Verified |
| LastSyncDate | Date | [ ] Verified |
| TechnicalInsights | Multi-select | [ ] Verified |
| ProblemSolvingPatterns | Multi-select | [ ] Verified |
| CommunicationStyle | Select | [ ] Verified |
| ConfidenceScore | Number | [ ] Verified |
| TopicsOfInterest | Multi-select | [ ] Verified |
| KeySkills | Multi-select | [ ] Verified |
| ProjectInterests | Multi-select | [ ] Verified |
| GitHubSource | Rich text | [ ] Verified |

### Workflow Triggers
- [ ] Schedule trigger configured (every 6 hours)
- [ ] Manual trigger works (workflow_dispatch)
- [ ] Push trigger works (for testing)
- [ ] Concurrency controls in place

### Error Handling
- [ ] Workflow includes retry logic (3 attempts)
- [ ] Exponential backoff implemented
- [ ] Logs uploaded as artifacts
- [ ] Issues created on failure
- [ ] Slack notifications configured (optional)

## 📊 Monitoring

### First 24 Hours
- [ ] Monitor first scheduled run
- [ ] Check for any error issues created
- [ ] Review sync logs in artifacts
- [ ] Verify Notion database updates
- [ ] Check sync status file (`.sync-status.json`)

### Ongoing
- [ ] Set up GitHub notifications for workflow failures
- [ ] Review Dependabot PRs weekly
- [ ] Check sync logs monthly
- [ ] Monitor Notion database growth
- [ ] Rotate API keys quarterly (security)

## 🚨 Troubleshooting

If sync fails, check:
1. [ ] Secrets are configured correctly
2. [ ] Notion integration has database access
3. [ ] JSON files are valid
4. [ ] Notion API is operational (status.notion.so)
5. [ ] Rate limits not exceeded
6. [ ] Network connectivity is stable

## 📚 Documentation

Quick links:
- [Workflow Setup Guide](.github/WORKFLOW_SETUP.md)
- [Workflow File](.github/workflows/notion-sync.yml)
- [Sync Script](scripts/notion-sync.js)
- [Issue Template](.github/ISSUE_TEMPLATE/sync-failure.md)

## 🎯 Success Criteria

Your automation is working correctly when:
- ✅ Scheduled runs complete successfully every 6 hours
- ✅ Data syncs to Notion without errors
- ✅ Logs show no warnings or failures
- ✅ Database updates reflect latest data
- ✅ No error issues are created
- ✅ Sync status file is updated regularly

## 🔄 Next Steps

After successful setup:
1. [ ] Document any custom configurations
2. [ ] Set up monitoring alerts
3. [ ] Create backup of Notion database
4. [ ] Plan for scaling (if needed)
5. [ ] Review and optimize sync frequency
6. [ ] Train team members on workflow

---

**Last Updated:** December 2025  
**Status:** Ready for production ✅
