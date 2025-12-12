# GitHub Actions Workflow Setup Guide

## 🎯 Overview

This repository includes an automated GitHub Actions workflow that syncs data to Notion every 6 hours. This guide will help you configure and verify the workflow.

## 📋 Prerequisites

Before the workflow can run successfully, you need:

1. ✅ A Notion integration with API access
2. ✅ A Notion database with the correct schema
3. ✅ GitHub repository secrets configured

## 🔑 Required Secrets

The workflow requires two GitHub Secrets to be configured:

### 1. `NOTION_API_KEY`
Your Notion integration token.

**How to get it:**
1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Name it (e.g., "ChatGPT Sync")
4. Select your workspace
5. Copy the "Internal Integration Token"

### 2. `NOTION_DATABASE_ID`
The ID of your Notion database.

**How to get it:**
1. Open your Notion database in a browser
2. Copy the URL - it looks like:
   ```
   https://www.notion.so/workspace/DATABASE_ID?v=...
   ```
3. Extract the `DATABASE_ID` (32 character alphanumeric string)
4. Alternatively, share the database and extract ID from the share link

### Adding Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:
   - Name: `NOTION_API_KEY`, Value: `your_integration_token`
   - Name: `NOTION_DATABASE_ID`, Value: `your_database_id`

## 📊 Notion Database Schema

Your Notion database must have these properties:

| Property Name | Property Type | Required |
|---------------|---------------|----------|
| ConversationID | Title | ✅ Yes |
| AnalysisDate | Date | ✅ Yes |
| LastSyncDate | Date | ✅ Yes |
| TechnicalInsights | Multi-select | ⚪ Optional |
| ProblemSolvingPatterns | Multi-select | ⚪ Optional |
| CommunicationStyle | Select | ⚪ Optional |
| ConfidenceScore | Number | ⚪ Optional |
| TopicsOfInterest | Multi-select | ⚪ Optional |
| KeySkills | Multi-select | ⚪ Optional |
| ProjectInterests | Multi-select | ⚪ Optional |
| GitHubSource | Rich text | ⚪ Optional |

**Important:** The property names must match exactly (case-sensitive).

## 🔗 Connecting Integration to Database

After creating your integration, you must grant it access to your database:

1. Open your Notion database
2. Click the "•••" menu in the top-right
3. Scroll down to "Connections"
4. Click "Add connections"
5. Select your integration
6. Click "Confirm"

## 🚀 Workflow Triggers

The workflow runs automatically on:

### 1. Schedule (Primary)
- **Frequency:** Every 6 hours
- **Times (UTC):** 00:00, 06:00, 12:00, 18:00
- **Cron:** `0 */6 * * *`

### 2. Manual Trigger
You can manually trigger the workflow:
1. Go to **Actions** tab
2. Select "Notion Sync Automation"
3. Click "Run workflow"
4. Choose options:
   - **Branch:** Usually `main`
   - **Dry-run:** `true` to test without writing to Notion

### 3. Push Events (Testing)
Automatically runs when you push changes to:
- `data/**` (data files)
- `scripts/**` (sync scripts)
- `.github/workflows/**` (workflow files)

## 🔄 Workflow Features

### ✅ Retry Logic
- **Attempts:** Up to 3 tries
- **Backoff:** Exponential (30s, 60s, 120s)
- **Reason:** Handles transient network/API issues

### 📝 Logging & Artifacts
- All sync logs are uploaded as artifacts
- **Retention:** 30 days
- **Access:** Actions tab → Select run → Artifacts section

### 🚨 Error Handling
On failure, the workflow:
1. ✅ Creates a detailed GitHub issue (or comments on existing)
2. ✅ Uploads full logs as artifacts
3. ✅ Sends Slack notification (if configured)
4. ✅ Generates error analysis in workflow summary

### 📊 Success Reporting
On success, the workflow:
- Logs completion details
- Updates sync status file
- Generates summary in workflow output

## 🧪 Testing the Workflow

### Option 1: Manual Test Run
1. Go to **Actions** → **Notion Sync Automation**
2. Click **Run workflow**
3. Select **dry_run: true**
4. Click **Run workflow**
5. Monitor the run in real-time

### Option 2: Test with Push
1. Add a test JSON file to `/data` directory
2. Commit and push to `main`
3. Workflow will trigger automatically

### Option 3: Local Testing
Before relying on the workflow, test locally:
```bash
# Set up environment
export NOTION_API_KEY="your_key_here"
export NOTION_DATABASE_ID="your_db_id_here"

# Install dependencies
npm install

# Run sync script
node scripts/notion-sync.js

# Check logs
cat logs/sync.log
```

## 📈 Monitoring

### View Workflow Runs
1. Go to **Actions** tab
2. Click on "Notion Sync Automation"
3. View all past runs with status

### Check Sync Status
The workflow maintains a sync status file at `data/.sync-status.json`:
```json
{
  "lastSync": "2025-12-12T03:44:13.000Z",
  "syncHistory": [...],
  "processedFiles": {
    "file.json": {
      "conversationId": "...",
      "lastSync": "...",
      "status": "success"
    }
  }
}
```

### Review Logs
- **In GitHub:** Actions → Select run → View logs
- **Artifacts:** Download `sync-logs-XXX.zip`
- **Issues:** Automatically created on failures

## 🛠️ Troubleshooting

### ❌ "NOTION_API_KEY environment variable is not set"
**Solution:** Verify secrets are configured in Settings → Secrets and variables → Actions

### ❌ "Failed to create Notion page: object_not_found"
**Solution:** 
1. Verify `NOTION_DATABASE_ID` is correct
2. Ensure integration has access to the database (see "Connecting Integration" above)

### ❌ "Validation failed"
**Solution:**
1. Check data files in `/data` directory match schema
2. Review error details in workflow logs
3. Validate JSON files are properly formatted

### ❌ "Rate limited"
**Solution:**
- Workflow includes automatic retry with backoff
- Wait for the retry attempts to complete
- If persistent, check Notion API status: https://status.notion.so/

### ❌ Workflow not running on schedule
**Solution:**
1. Ensure workflow file is on `main` branch
2. Check repository settings: Settings → Actions → General → "Allow all actions"
3. GitHub Actions may have 5-10 minute delay on scheduled runs
4. Verify no concurrent runs are blocking it

## 🔔 Optional: Slack Notifications

To enable Slack notifications on failure:

1. Create a Slack webhook:
   - Go to https://api.slack.com/apps
   - Create app → "From scratch"
   - Add "Incoming Webhooks" feature
   - Create webhook for your channel

2. Add webhook to GitHub Secrets:
   - Name: `SLACK_WEBHOOK_URL`
   - Value: Your webhook URL

The workflow will automatically use it when available.

## 📊 Workflow Metrics

The workflow tracks:
- ✅ Total sync attempts
- ✅ Records created vs. updated
- ✅ Failed records with error details
- ✅ Sync duration
- ✅ Success/failure rate over time

View metrics in:
- Workflow run summaries
- Sync status file
- Log artifacts

## 🔒 Security Best Practices

1. ✅ Never commit secrets to the repository
2. ✅ Use GitHub Secrets for sensitive data
3. ✅ Regularly rotate Notion API keys
4. ✅ Limit integration permissions to minimum required
5. ✅ Review workflow logs for sensitive data leaks
6. ✅ Use branch protection rules on `main`

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Notion API Documentation](https://developers.notion.com/)
- [Workflow File](.github/workflows/notion-sync.yml)
- [Sync Script](../scripts/notion-sync.js)

## 🆘 Getting Help

If you encounter issues:

1. Check the [Issues](../../issues) tab for similar problems
2. Review workflow logs for error details
3. Test locally with the same configuration
4. Create a new issue with:
   - Workflow run link
   - Error messages (sanitized)
   - Steps to reproduce

---

**Last Updated:** December 2025  
**Workflow Version:** 1.0.0  
**Maintainer:** Haolong Chen
