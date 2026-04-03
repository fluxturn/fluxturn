# Fluxturn Template Creation Guide

This guide explains how to create workflow templates for Fluxturn. Templates are JSON files that define pre-built workflows users can import and customize.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Template Structure](#template-structure)
3. [Node Types](#node-types)
4. [Creating a Template Step-by-Step](#creating-a-template-step-by-step)
5. [Validation & Testing](#validation--testing)
6. [Best Practices](#best-practices)
7. [Examples](#examples)

---

## Quick Start

### File Location
```
backend/src/common/templates/
```

### Naming Convention
```
your-template-name.json
```
Use lowercase with hyphens. Examples:
- `gmail-to-slack-notification.json`
- `lead-capture-to-crm.json`

### Generate UUID
Every template needs a unique `id`. Generate one using:
```bash
# Node.js
node -e "console.log(require('uuid').v4())"

# Or online: https://www.uuidgenerator.net/
```

---

## Template Structure

### Minimal Template
```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "name": "My Template Name",
  "description": "Brief description of what this template does",
  "category": "communication",
  "canvas": {
    "nodes": [],
    "edges": []
  }
}
```

### Full Template Structure
```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "name": "Template Display Name",
  "description": "Detailed description of the workflow",
  "category": "communication",
  "difficulty": "beginner",
  "estimatedSetupTime": "5 min",
  "canvas": {
    "nodes": [...],
    "edges": [...]
  },
  "steps": [],
  "triggers": [],
  "conditions": [],
  "variables": [],
  "outputs": [],
  "required_connectors": ["gmail", "slack"],
  "tags": ["email", "notification", "automation"],
  "is_public": true,
  "verified": false,
  "metadata": {},
  "ai_prompt": null
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | **Yes** | Unique identifier (generate with uuid) |
| `name` | string | **Yes** | Display name (must be unique) |
| `description` | string | **Yes** | What the template does |
| `category` | string | **Yes** | Category for filtering |
| `canvas.nodes` | array | **Yes** | Array of workflow nodes |
| `canvas.edges` | array | **Yes** | Connections between nodes |
| `difficulty` | string | No | `beginner`, `intermediate`, `advanced` |
| `estimatedSetupTime` | string | No | e.g., "5 min", "15 min" |
| `required_connectors` | array | No | List of connector names needed |
| `tags` | array | No | Searchable tags |
| `is_public` | boolean | No | Default: `true` |
| `verified` | boolean | No | Default: `false` |

### Categories
```
communication    - Email, messaging, notifications
social_media     - Social platforms, cross-posting
crm             - Customer relationship management
productivity    - Task management, scheduling
developer       - GitHub, CI/CD, code tools
marketing       - Campaigns, analytics
data            - Database, spreadsheets, sync
ai              - AI-powered workflows
```

---

## Node Types

### 1. CONNECTOR_TRIGGER
Starts the workflow when an event occurs.

```json
{
  "id": "trigger_1",
  "type": "CONNECTOR_TRIGGER",
  "position": { "x": 100, "y": 200 },
  "data": {
    "label": "New Email Received",
    "connector": "gmail",
    "triggerId": "email_received",
    "icon": "mail",
    "category": "trigger",
    "description": "Triggers when a new email arrives",
    "triggerName": "Email Received",
    "eventType": "polling",
    "connectorType": "gmail",
    "connectorDisplayName": "Gmail",
    "webhookRequired": false,
    "config": {
      "labelName": "INBOX",
      "pollInterval": 300
    },
    "inputSchema": {
      "labelName": {
        "type": "string",
        "label": "Label Name",
        "description": "Gmail label to monitor"
      }
    },
    "outputSchema": {
      "from": { "type": "string", "description": "Sender email" },
      "subject": { "type": "string", "description": "Email subject" },
      "body": { "type": "string", "description": "Email body" }
    }
  }
}
```

### 2. CONNECTOR_ACTION
Performs an action using a connector.

```json
{
  "id": "action_1",
  "type": "CONNECTOR_ACTION",
  "position": { "x": 400, "y": 200 },
  "data": {
    "label": "Send Slack Message",
    "connector": "slack",
    "actionId": "send_message",
    "icon": "message-square",
    "category": "action",
    "description": "Send a message to a Slack channel",
    "actionName": "Send Message",
    "connectorType": "slack",
    "connectorDisplayName": "Slack",
    "config": {
      "channel": "#general",
      "text": "{{trigger_1.subject}}"
    },
    "inputSchema": {
      "channel": {
        "type": "string",
        "required": true,
        "label": "Channel"
      },
      "text": {
        "type": "string",
        "required": true,
        "label": "Message"
      }
    },
    "outputSchema": {
      "messageId": { "type": "string" },
      "success": { "type": "boolean" }
    }
  }
}
```

### 3. SET (Data Transformation)
Maps and transforms data between nodes.

```json
{
  "id": "set_1",
  "type": "SET",
  "position": { "x": 400, "y": 200 },
  "data": {
    "label": "Transform Data",
    "icon": "edit",
    "category": "utility",
    "description": "Map and transform fields",
    "config": {
      "mode": "manual",
      "fieldsToSet": [
        {
          "name": "email",
          "value": "={{$json.from}}"
        },
        {
          "name": "timestamp",
          "value": "={{new Date().toISOString()}}"
        }
      ],
      "includeOtherFields": false
    }
  }
}
```

### 4. SPLIT (Parallel Execution)
Duplicates data to multiple outputs for parallel processing.

```json
{
  "id": "split_1",
  "type": "SPLIT",
  "position": { "x": 700, "y": 200 },
  "data": {
    "mode": "duplicate",
    "label": "Split to Platforms",
    "description": "Duplicate to 2 outputs",
    "numberOfOutputs": 2
  }
}
```

### 5. MERGE (Combine Results)
Combines results from parallel branches.

```json
{
  "id": "merge_1",
  "type": "MERGE",
  "position": { "x": 1200, "y": 200 },
  "data": {
    "mode": "append",
    "label": "Merge Results",
    "description": "Combine 2 inputs",
    "numberOfInputs": 2
  }
}
```

### 6. IF (Conditional)
Branches workflow based on conditions.

```json
{
  "id": "if_1",
  "type": "IF",
  "position": { "x": 400, "y": 200 },
  "data": {
    "label": "Check Priority",
    "conditions": [
      {
        "field": "priority",
        "operator": "equals",
        "value": "high"
      }
    ],
    "combineWith": "AND"
  }
}
```

---

## Creating a Template Step-by-Step

### Step 1: Plan Your Workflow
Before coding, sketch out:
- What triggers the workflow?
- What data transformations are needed?
- What actions should occur?
- What connectors are required?

### Step 2: Create the JSON File

```bash
# Create new template file
touch backend/src/common/templates/my-new-template.json
```

### Step 3: Add Basic Structure

```json
{
  "id": "GENERATE-UUID-HERE",
  "name": "My New Template",
  "description": "Description of what it does",
  "category": "communication",
  "canvas": {
    "nodes": [],
    "edges": []
  },
  "required_connectors": []
}
```

### Step 4: Add Nodes

Position nodes on a grid (recommended spacing: 300-350px horizontal, 100-200px vertical):

```json
"nodes": [
  {
    "id": "node_1",
    "type": "CONNECTOR_TRIGGER",
    "position": { "x": 100, "y": 200 },
    "data": { ... }
  },
  {
    "id": "node_2",
    "type": "CONNECTOR_ACTION",
    "position": { "x": 450, "y": 200 },
    "data": { ... }
  }
]
```

### Step 5: Connect Nodes with Edges

```json
"edges": [
  {
    "id": "edge_1",
    "source": "node_1",
    "target": "node_2",
    "type": "default",
    "animated": true,
    "style": {
      "stroke": "#06b6d4",
      "strokeWidth": 2
    },
    "markerEnd": {
      "type": "arrowclosed",
      "color": "#06b6d4",
      "width": 20,
      "height": 20
    }
  }
]
```

### Step 6: Add Variable References

Use template syntax to reference data from previous nodes:
```
{{node_1.field}}           - Reference node output
{{trigger_1.subject}}      - Reference trigger data
={{$json.field}}           - Expression syntax
={{new Date().toISOString()}} - JavaScript expressions
```

---

## Validation & Testing

### 1. Validate JSON Syntax
```bash
# Check JSON is valid
node -e "JSON.parse(require('fs').readFileSync('backend/src/common/templates/my-template.json'))"
```

### 2. Run Analysis Script
```bash
cd backend
node scripts/analyze-template-files.js
```

This checks:
- All templates have unique `id`
- All templates have unique `name`
- No missing required fields

### 3. Seed to Database
```bash
cd backend
npm run seed
```

Look for your template in the output:
```
✅ Inserted new template: "My New Template" (ID: xxx)
```

### 4. Preview in UI
1. Start the development server
2. Go to Templates page
3. Find your template
4. Click to preview the workflow canvas

---

## Best Practices

### Naming
- Use descriptive, action-oriented names
- Format: `[Source] to [Destination] [Action]`
- Examples:
  - "Gmail to Slack Notification"
  - "GitHub PR to Discord Alert"
  - "Form Submission to CRM Lead"

### Node IDs
- Use descriptive IDs: `gmail_trigger_1`, `slack_action_1`
- Keep consistent naming: `node_1`, `node_2` or `trigger_1`, `action_1`

### Positioning
- Start trigger at x: 60-100
- Space nodes 300-350px apart horizontally
- For parallel branches, offset vertically by 100-200px
- Keep workflow flowing left-to-right

### Config Values
- Use placeholders for user-configurable values: `{{your_spreadsheet_id}}`
- Provide sensible defaults where possible
- Document required configuration in description

### Schemas
- Always include `inputSchema` for configurable nodes
- Include `outputSchema` to help users understand available data
- Use clear labels and descriptions

---

## Examples

### Simple 2-Node Template
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Email to Slack Alert",
  "description": "Forward important emails to a Slack channel",
  "category": "communication",
  "difficulty": "beginner",
  "estimatedSetupTime": "5 min",
  "required_connectors": ["gmail", "slack"],
  "tags": ["email", "slack", "notification"],
  "canvas": {
    "nodes": [
      {
        "id": "gmail_trigger",
        "type": "CONNECTOR_TRIGGER",
        "position": { "x": 100, "y": 200 },
        "data": {
          "label": "New Email",
          "connector": "gmail",
          "triggerId": "email_received",
          "triggerName": "Email Received",
          "connectorType": "gmail",
          "connectorDisplayName": "Gmail",
          "config": {},
          "outputSchema": {
            "from": { "type": "string" },
            "subject": { "type": "string" },
            "body": { "type": "string" }
          }
        }
      },
      {
        "id": "slack_action",
        "type": "CONNECTOR_ACTION",
        "position": { "x": 450, "y": 200 },
        "data": {
          "label": "Send to Slack",
          "connector": "slack",
          "actionId": "send_message",
          "actionName": "Send Message",
          "connectorType": "slack",
          "connectorDisplayName": "Slack",
          "config": {
            "channel": "#notifications",
            "text": "New email from {{gmail_trigger.from}}: {{gmail_trigger.subject}}"
          }
        }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "gmail_trigger",
        "target": "slack_action",
        "animated": true
      }
    ]
  },
  "verified": false,
  "is_public": true
}
```

### Template with Data Transformation
```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "name": "Form to CRM Lead",
  "description": "Capture form submissions and create CRM leads",
  "category": "crm",
  "canvas": {
    "nodes": [
      {
        "id": "form_trigger",
        "type": "CONNECTOR_TRIGGER",
        "position": { "x": 100, "y": 200 },
        "data": {
          "label": "Form Submitted",
          "connector": "google_forms",
          "triggerId": "form_response",
          "connectorType": "google_forms",
          "connectorDisplayName": "Google Forms"
        }
      },
      {
        "id": "transform",
        "type": "SET",
        "position": { "x": 400, "y": 200 },
        "data": {
          "label": "Map to Lead Format",
          "config": {
            "mode": "manual",
            "fieldsToSet": [
              { "name": "firstName", "value": "={{$json.name.split(' ')[0]}}" },
              { "name": "lastName", "value": "={{$json.name.split(' ').slice(1).join(' ')}}" },
              { "name": "email", "value": "={{$json.email}}" },
              { "name": "source", "value": "Google Form" },
              { "name": "createdAt", "value": "={{new Date().toISOString()}}" }
            ]
          }
        }
      },
      {
        "id": "crm_action",
        "type": "CONNECTOR_ACTION",
        "position": { "x": 700, "y": 200 },
        "data": {
          "label": "Create Lead",
          "connector": "salesforce",
          "actionId": "create_lead",
          "connectorType": "salesforce",
          "connectorDisplayName": "Salesforce",
          "config": {
            "leadData": "={{$json}}"
          }
        }
      }
    ],
    "edges": [
      { "id": "e1", "source": "form_trigger", "target": "transform" },
      { "id": "e2", "source": "transform", "target": "crm_action" }
    ]
  }
}
```

### Template with Split/Merge (Parallel)
```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "name": "Cross-Platform Post",
  "description": "Post to multiple social platforms simultaneously",
  "category": "social_media",
  "canvas": {
    "nodes": [
      {
        "id": "trigger",
        "type": "CONNECTOR_TRIGGER",
        "position": { "x": 100, "y": 200 },
        "data": { "label": "New Content", "connector": "notion" }
      },
      {
        "id": "split",
        "type": "SPLIT",
        "position": { "x": 400, "y": 200 },
        "data": { "mode": "duplicate", "numberOfOutputs": 3 }
      },
      {
        "id": "twitter",
        "type": "CONNECTOR_ACTION",
        "position": { "x": 700, "y": 100 },
        "data": { "label": "Post to Twitter", "connector": "twitter" }
      },
      {
        "id": "linkedin",
        "type": "CONNECTOR_ACTION",
        "position": { "x": 700, "y": 200 },
        "data": { "label": "Post to LinkedIn", "connector": "linkedin" }
      },
      {
        "id": "facebook",
        "type": "CONNECTOR_ACTION",
        "position": { "x": 700, "y": 300 },
        "data": { "label": "Post to Facebook", "connector": "facebook" }
      },
      {
        "id": "merge",
        "type": "MERGE",
        "position": { "x": 1000, "y": 200 },
        "data": { "mode": "append", "numberOfInputs": 3 }
      },
      {
        "id": "log",
        "type": "CONNECTOR_ACTION",
        "position": { "x": 1300, "y": 200 },
        "data": { "label": "Log Results", "connector": "google_sheets" }
      }
    ],
    "edges": [
      { "id": "e1", "source": "trigger", "target": "split" },
      { "id": "e2", "source": "split", "target": "twitter", "sourceHandle": "source-1" },
      { "id": "e3", "source": "split", "target": "linkedin", "sourceHandle": "source-2" },
      { "id": "e4", "source": "split", "target": "facebook", "sourceHandle": "source-3" },
      { "id": "e5", "source": "twitter", "target": "merge", "targetHandle": "target-1" },
      { "id": "e6", "source": "linkedin", "target": "merge", "targetHandle": "target-2" },
      { "id": "e7", "source": "facebook", "target": "merge", "targetHandle": "target-3" },
      { "id": "e8", "source": "merge", "target": "log" }
    ]
  },
  "metadata": {
    "uses_split_node": true,
    "uses_merge_node": true,
    "parallel_execution": true
  }
}
```

---

## Seeding Process

When you run `npm run seed`, the template seeder:

1. Reads all `.json` files from `backend/src/common/templates/`
2. For each template:
   - Checks if a template with the same `name` exists in database
   - If new: Inserts with the ID from JSON file
   - If exists: Compares fields and updates only changed fields
   - If unchanged: Skips (no database write)
3. Reports: `X inserted, Y updated, Z unchanged`

### Smart Update
The seeder uses field-level change detection:
- Only modified fields are updated
- Unchanged templates are skipped entirely
- User-created templates are never deleted

---

## Troubleshooting

### Template not appearing
1. Check JSON syntax is valid
2. Ensure `id` is a valid UUID
3. Ensure `name` is unique
4. Run `npm run seed` and check output

### Duplicate template error
- Each template must have unique `id` AND unique `name`
- Run `node scripts/analyze-template-files.js` to find duplicates

### Canvas not rendering correctly
- Check node positions don't overlap
- Verify edge `source` and `target` match node IDs
- For SPLIT/MERGE, use correct `sourceHandle`/`targetHandle`

---

## Quick Reference

### Generate UUID
```bash
node -e "console.log(require('uuid').v4())"
```

### Validate Template
```bash
node scripts/analyze-template-files.js
```

### Seed Templates
```bash
npm run seed
```

### Common Connectors
```
gmail, slack, discord, telegram, twitter, linkedin, facebook,
google_sheets, google_drive, notion, airtable, salesforce,
github, jira, clickup, trello, openai, anthropic
```

### Edge Colors (optional styling)
```
Cyan:   #06b6d4
Teal:   #14b8a6
Purple: #8b5cf6
Green:  #22c55e
Orange: #f97316
```
