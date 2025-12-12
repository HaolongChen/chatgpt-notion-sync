---
name: Sync Failure Report
about: Report an issue with the automated Notion sync
title: '[SYNC] '
labels: automated-sync, bug, needs-investigation
assignees: HaolongChen
---

## 🚨 Sync Failure Details

**Workflow Run:** #[Run Number]  
**Link:** [Paste workflow run URL here]  
**Date/Time:** [When did this occur?]

## 📋 Context

**Trigger Type:**
- [ ] Scheduled (automatic)
- [ ] Manual
- [ ] Push event

**Environment:**
- Node Version: [e.g., 18.x]
- Repository: chatgpt-notion-sync
- Branch: [e.g., main]

## ❌ Error Description

<!-- Describe what went wrong -->

### Error Message
```
[Paste error message from logs here]
```

### Stack Trace (if available)
```
[Paste stack trace here]
```

## 🔍 Investigation Steps Taken

<!-- Check all that apply -->

- [ ] Reviewed workflow logs
- [ ] Checked Notion API credentials
- [ ] Verified database connection
- [ ] Validated data files in `/data` directory
- [ ] Checked Notion API status (https://status.notion.so/)
- [ ] Tested locally with same configuration

## 📊 Additional Context

**Recent Changes:**
<!-- Any recent commits or configuration changes? -->

**Data Files Affected:**
<!-- List any specific JSON files that failed -->

**Notion Database Status:**
- [ ] Integration connected
- [ ] Database accessible
- [ ] Correct schema properties

## 💡 Possible Causes

<!-- What do you think might be causing this? -->

## 🔗 Related Issues

<!-- Link to any related issues -->

## 📎 Attachments

<!-- Attach relevant log files or screenshots -->
