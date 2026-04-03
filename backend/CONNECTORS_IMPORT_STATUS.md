# Connectors Import Status - Batch 10

This document tracks the import status of 10 new connectors from n8n to Fluxturn.

## Overview

| # | Connector | Category | Complexity | Auth Type | Status | Definition | Connector | Index | Notes |
|---|-----------|----------|------------|-----------|--------|------------|-----------|-------|-------|
| 1 | Jenkins | devops | Medium | api_key | ✅ Complete | ✅ | ✅ | ✅ | Registered in development/index.ts |
| 2 | TravisCI | devops | Medium | api_key | 🟡 Partial | ✅ | ❌ | ❌ | Definition exists, needs connector class |
| 3 | Netlify | devops | Medium | api_key | 🟡 Partial | ✅ | ❌ | ❌ | Definition exists in development/, needs connector class |
| 4 | Cloudflare | infrastructure | Medium | api_key | 🟡 Partial | ✅ | ❌ | ❌ | Definition exists, needs connector class |
| 5 | SSH | utility | Medium | custom | 🟡 Partial | ✅ | ❌ | ❌ | Definition exists, needs connector class |
| 6 | FTP | utility | Medium | custom | ❌ Missing | ❌ | ❌ | ❌ | Empty folder, needs full import |
| 7 | Git | development | Medium | custom | 🟡 Partial | ✅ | ❌ | ❌ | Definition exists, needs connector class |
| 8 | Bitbucket | development | Medium | oauth2 | 🟡 Partial | ✅ | ❌ | ❌ | Definition exists, needs connector class |
| 9 | ExecuteCommand | utility | Medium | none | ❌ Missing | ❌ | ❌ | ❌ | Empty folder, needs full import |
| 10 | Todoist | productivity | Medium | oauth2 | ❌ Missing | ❌ | ❌ | ❌ | Empty folder, needs full import |

## Status Legend

- ✅ **Complete**: Fully implemented and registered
- 🟡 **Partial**: Definition exists but missing connector implementation
- ❌ **Missing**: Not yet implemented

## Import Checklist per Connector

### 1. Jenkins ✅
- [x] Definition file: `development/jenkins/jenkins.definition.ts`
- [x] Connector class: `development/jenkins/jenkins.connector.ts`
- [x] Index export: `development/jenkins/index.ts`
- [x] Category registration: Added to `development/index.ts`
- [x] Connector type: Added to `types/index.ts`

### 2. TravisCI 🟡
- [x] Definition file: `development/travis-ci/travis-ci.definition.ts`
- [ ] Connector class: `development/travis-ci/travis-ci.connector.ts`
- [ ] Index export: `development/travis-ci/index.ts`
- [ ] Category registration: Add to `development/index.ts`
- [ ] Connector type: Add to `types/index.ts`

### 3. Netlify 🟡
- [x] Definition file: `development/netlify/netlify.definition.ts` (Should be in devops?)
- [ ] Connector class: `development/netlify/netlify.connector.ts`
- [ ] Index export: `development/netlify/index.ts`
- [ ] Category registration: Add to `development/index.ts`
- [ ] Connector type: Add to `types/index.ts`

### 4. Cloudflare 🟡
- [x] Definition file: `infrastructure/cloudflare/cloudflare.definition.ts`
- [ ] Connector class: `infrastructure/cloudflare/cloudflare.connector.ts`
- [ ] Index export: `infrastructure/cloudflare/index.ts`
- [ ] Category registration: Add to `infrastructure/index.ts`
- [ ] Connector type: Add to `types/index.ts`

### 5. SSH 🟡
- [x] Definition file: `utility/ssh/ssh.definition.ts`
- [ ] Connector class: `utility/ssh/ssh.connector.ts`
- [ ] Index export: `utility/ssh/index.ts`
- [ ] Category registration: Add to `utility/index.ts`
- [ ] Connector type: Add to `types/index.ts`

### 6. FTP ❌
- [ ] Definition file: `utility/ftp/ftp.definition.ts`
- [ ] Connector class: `utility/ftp/ftp.connector.ts`
- [ ] Index export: `utility/ftp/index.ts`
- [ ] Category registration: Add to `utility/index.ts`
- [ ] Connector type: Add to `types/index.ts`
- [ ] Import from n8n: `/Users/user/Desktop/n8n/packages/nodes-base/nodes/Ftp/`

### 7. Git 🟡
- [x] Definition file: `development/git/git.definition.ts`
- [ ] Connector class: `development/git/git.connector.ts`
- [ ] Index export: `development/git/index.ts`
- [ ] Category registration: Add to `development/index.ts`
- [ ] Connector type: Add to `types/index.ts`

### 8. Bitbucket 🟡
- [x] Definition file: `development/bitbucket/bitbucket.definition.ts`
- [ ] Connector class: `development/bitbucket/bitbucket.connector.ts`
- [ ] Index export: `development/bitbucket/index.ts`
- [ ] Category registration: Add to `development/index.ts`
- [ ] Connector type: Add to `types/index.ts`

### 9. ExecuteCommand ❌
- [ ] Definition file: `utility/execute-command/execute-command.definition.ts`
- [ ] Connector class: `utility/execute-command/execute-command.connector.ts`
- [ ] Index export: `utility/execute-command/index.ts`
- [ ] Category registration: Add to `utility/index.ts`
- [ ] Connector type: Add to `types/index.ts`
- [ ] Import from n8n: `/Users/user/Desktop/n8n/packages/nodes-base/nodes/ExecuteCommand/`

### 10. Todoist ❌
- [ ] Definition file: `productivity/todoist/todoist.definition.ts`
- [ ] Connector class: `productivity/todoist/todoist.connector.ts`
- [ ] Index export: `productivity/todoist/index.ts`
- [ ] Category registration: Add to `productivity/index.ts`
- [ ] Connector type: Add to `types/index.ts`
- [ ] Import from n8n: `/Users/user/Desktop/n8n/packages/nodes-base/nodes/Todoist/`

## n8n Source Locations

| Connector | n8n Node Path | n8n Credentials Path |
|-----------|---------------|---------------------|
| Jenkins | `/Users/user/Desktop/n8n/packages/nodes-base/nodes/Jenkins/` | `/Users/user/Desktop/n8n/packages/nodes-base/credentials/JenkinsApi.credentials.ts` |
| TravisCI | `/Users/user/Desktop/n8n/packages/nodes-base/nodes/TravisCi/` | `/Users/user/Desktop/n8n/packages/nodes-base/credentials/TravisCiApi.credentials.ts` |
| Netlify | `/Users/user/Desktop/n8n/packages/nodes-base/nodes/Netlify/` | `/Users/user/Desktop/n8n/packages/nodes-base/credentials/NetlifyApi.credentials.ts` |
| Cloudflare | `/Users/user/Desktop/n8n/packages/nodes-base/nodes/Cloudflare/` | `/Users/user/Desktop/n8n/packages/nodes-base/credentials/CloudflareApi.credentials.ts` |
| SSH | `/Users/user/Desktop/n8n/packages/nodes-base/nodes/Ssh/` | `/Users/user/Desktop/n8n/packages/nodes-base/credentials/Ssh.credentials.ts` |
| FTP | `/Users/user/Desktop/n8n/packages/nodes-base/nodes/Ftp/` | `/Users/user/Desktop/n8n/packages/nodes-base/credentials/Ftp.credentials.ts` |
| Git | `/Users/user/Desktop/n8n/packages/nodes-base/nodes/Git/` | N/A (local operations) |
| Bitbucket | `/Users/user/Desktop/n8n/packages/nodes-base/nodes/Bitbucket/` | `/Users/user/Desktop/n8n/packages/nodes-base/credentials/BitbucketApi.credentials.ts` |
| ExecuteCommand | `/Users/user/Desktop/n8n/packages/nodes-base/nodes/ExecuteCommand/` | N/A (local operations) |
| Todoist | `/Users/user/Desktop/n8n/packages/nodes-base/nodes/Todoist/` | `/Users/user/Desktop/n8n/packages/nodes-base/credentials/TodoistApi.credentials.ts` |

## Implementation Order

Based on complexity and dependencies:

1. ✅ **Jenkins** - Complete
2. **FTP** - Simple file operations (Missing)
3. **ExecuteCommand** - Simple shell execution (Missing)
4. **Todoist** - Simple task management API (Missing)
5. **TravisCI** - CI/CD API calls (Partial)
6. **Netlify** - Deployment platform API (Partial)
7. **Cloudflare** - Infrastructure/CDN API (Partial)
8. **SSH** - Remote command execution (Partial)
9. **Git** - Version control operations (Partial)
10. **Bitbucket** - Repository management API (Partial)

## Progress Summary

- **Complete**: 1/10 (10%)
- **Partial** (Definition only): 7/10 (70%)
- **Missing**: 2/10 (20%)

## Next Steps

1. Complete missing connectors: FTP, ExecuteCommand, Todoist
2. Implement connector classes for partial connectors
3. Update category index files
4. Register connector types
5. Test all connectors

---

**Last Updated**: 2026-01-08
**Author**: Claude Code
