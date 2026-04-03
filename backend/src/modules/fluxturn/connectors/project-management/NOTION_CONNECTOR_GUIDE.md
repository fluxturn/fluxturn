# Notion Connector for FluxTurn

## Overview

The Notion connector provides comprehensive integration with Notion's API, allowing you to manage databases, pages, blocks, users, and perform advanced search operations within your FluxTurn workflows.

## Features

### ✨ Supported Operations

#### 📊 Database Operations (4 actions)
- **Query Database** - Query databases with filters, sorts, and pagination
- **Get Database** - Retrieve database schema and properties
- **Create Database** - Create new databases with custom properties
- **Update Database** - Update database titles and property schemas

#### 📄 Page Operations (3 actions)
- **Create Page** - Create pages in databases or as child pages with rich content
- **Get Page** - Retrieve page properties and metadata
- **Update Page** - Update page properties, icons, covers, and archive pages

#### 🔲 Block Operations (5 actions)
- **Append Block Children** - Add content blocks to pages (paragraphs, headings, lists, etc.)
- **Get Block Children** - Retrieve all child blocks from a page or block
- **Get Block** - Retrieve a specific block by ID
- **Update Block** - Modify existing block content
- **Delete Block** - Archive/delete blocks

#### 👥 User Operations (3 actions)
- **List Users** - Get all users in the workspace with pagination
- **Get User** - Retrieve specific user details
- **Get Current User** - Get integration bot user information

#### 🔍 Search Operations (1 action)
- **Search** - Search for pages and databases by title with filters and sorting

### 🎯 Triggers (Polling)

- **Database Page Created** - Triggers when a new page is created in a database
- **Database Page Updated** - Triggers when a page is updated in a database

---

## Authentication

The Notion connector supports **OAuth 2.0** and **Internal Integration Token** authentication.

### Option 1: Internal Integration Token (Recommended for Testing)

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Give it a name (e.g., "FluxTurn Integration")
4. Select the workspace
5. Copy the **Internal Integration Secret**
6. In FluxTurn, add this token to the **Access Token** field

### Option 2: OAuth 2.0 (Public Integrations)

1. Create a public integration at [Notion Integrations](https://www.notion.so/my-integrations)
2. Configure OAuth settings with your redirect URI
3. Use FluxTurn's OAuth flow to authenticate
4. Users will authorize access to their workspace

### Required Permissions

For full functionality, the integration needs:
- ✅ Read content
- ✅ Update content
- ✅ Insert content
- ✅ Read user information without email addresses

---

## Configuration

### Connector Configuration in FluxTurn

```json
{
  "accessToken": "secret_xxxxxxxxxxxxxxxxxxxxx",
  "workspaceId": "optional-workspace-id"
}
```

### Rate Limits

- **3 requests per second**
- Automatically handled by the connector with retry logic

---

## Usage Examples

### Example 1: Query a Database

**Action:** `database_query`

**Input:**
```json
{
  "databaseId": "1234567890abcdef1234567890abcdef",
  "filter": {
    "property": "Status",
    "select": {
      "equals": "Done"
    }
  },
  "sorts": [
    {
      "property": "Created",
      "direction": "descending"
    }
  ],
  "pageSize": 50
}
```

**Output:**
```json
{
  "results": [
    {
      "id": "page-id",
      "properties": {
        "Name": {...},
        "Status": {...},
        "Created": {...}
      },
      "created_time": "2024-01-15T10:00:00.000Z",
      "last_edited_time": "2024-01-15T15:30:00.000Z"
    }
  ],
  "has_more": false,
  "next_cursor": null
}
```

---

### Example 2: Create a Page in a Database

**Action:** `page_create`

**Input:**
```json
{
  "parentType": "database",
  "parentId": "1234567890abcdef1234567890abcdef",
  "properties": {
    "Name": {
      "title": [
        {
          "text": {
            "content": "New Task"
          }
        }
      ]
    },
    "Status": {
      "select": {
        "name": "In Progress"
      }
    },
    "Priority": {
      "select": {
        "name": "High"
      }
    },
    "Due Date": {
      "date": {
        "start": "2024-12-31"
      }
    }
  },
  "children": [
    {
      "type": "paragraph",
      "paragraph": {
        "rich_text": [
          {
            "text": {
              "content": "This is the task description."
            }
          }
        ]
      }
    }
  ],
  "icon": {
    "emoji": "📝"
  }
}
```

**Output:**
```json
{
  "id": "new-page-id",
  "created_time": "2024-01-15T10:00:00.000Z",
  "url": "https://notion.so/...",
  "properties": {...}
}
```

---

### Example 3: Append Blocks to a Page

**Action:** `block_append`

**Input:**
```json
{
  "blockId": "page-id-or-block-id",
  "children": [
    {
      "type": "heading_2",
      "heading_2": {
        "rich_text": [
          {
            "text": {
              "content": "Section Title"
            }
          }
        ]
      }
    },
    {
      "type": "paragraph",
      "paragraph": {
        "rich_text": [
          {
            "text": {
              "content": "This is a paragraph with "
            }
          },
          {
            "text": {
              "content": "bold text",
              "annotations": {
                "bold": true
              }
            }
          },
          {
            "text": {
              "content": " and "
            }
          },
          {
            "text": {
              "content": "italic text",
              "annotations": {
                "italic": true
              }
            }
          }
        ]
      }
    },
    {
      "type": "bulleted_list_item",
      "bulleted_list_item": {
        "rich_text": [
          {
            "text": {
              "content": "First bullet point"
            }
          }
        ]
      }
    },
    {
      "type": "to_do",
      "to_do": {
        "rich_text": [
          {
            "text": {
              "content": "Checkbox item"
            }
          }
        ],
        "checked": false
      }
    }
  ]
}
```

---

### Example 4: Search for Pages

**Action:** `search`

**Input:**
```json
{
  "query": "Meeting Notes",
  "filter": {
    "property": "object",
    "value": "page"
  },
  "sort": {
    "direction": "descending",
    "timestamp": "last_edited_time"
  },
  "pageSize": 20
}
```

**Output:**
```json
{
  "results": [
    {
      "id": "page-id",
      "object": "page",
      "created_time": "2024-01-10T10:00:00.000Z",
      "last_edited_time": "2024-01-15T14:00:00.000Z",
      "url": "https://notion.so/..."
    }
  ],
  "has_more": false
}
```

---

### Example 5: Update Page Properties

**Action:** `page_update`

**Input:**
```json
{
  "pageId": "existing-page-id",
  "properties": {
    "Status": {
      "select": {
        "name": "Completed"
      }
    },
    "Completion Date": {
      "date": {
        "start": "2024-01-15"
      }
    }
  },
  "icon": {
    "emoji": "✅"
  }
}
```

---

## Supported Block Types

The connector supports the following block types for content creation:

| Block Type | Usage |
|-----------|--------|
| `paragraph` | Regular text paragraphs |
| `heading_1` | Large headings |
| `heading_2` | Medium headings |
| `heading_3` | Small headings |
| `bulleted_list_item` | Bullet points |
| `numbered_list_item` | Numbered lists |
| `to_do` | Checkbox items |
| `toggle` | Collapsible sections |
| `code` | Code blocks |
| `quote` | Block quotes |
| `callout` | Callout boxes |
| `divider` | Horizontal dividers |
| `table_of_contents` | Auto-generated table of contents |

---

## Workflow Integration Examples

### Use Case 1: Automated Task Creation from Emails

```
Trigger: Gmail - New Email
↓
Filter: Email subject contains "TODO:"
↓
Action: Notion - Create Page
  └─ Create task in "Tasks" database
     └─ Title: Email subject
     └─ Description: Email body
     └─ Status: "To Do"
     └─ Priority: "Medium"
```

### Use Case 2: Database Sync

```
Trigger: Schedule - Every 1 hour
↓
Action: Notion - Query Database
  └─ Get all "In Progress" tasks
↓
Action: Slack - Send Message
  └─ Send summary to #team-updates channel
```

### Use Case 3: Meeting Notes Automation

```
Trigger: Google Calendar - Event Starts
↓
Action: Notion - Create Page
  └─ Create meeting notes page
     └─ Title: Meeting name
     └─ Date: Event date
     └─ Attendees: From calendar
↓
Action: Notion - Append Blocks
  └─ Add meeting agenda from description
```

### Use Case 4: Content Publishing Workflow

```
Trigger: Notion - Database Page Updated
↓
Filter: Status changed to "Ready to Publish"
↓
Action: Notion - Get Block Children
  └─ Get page content
↓
Action: WordPress - Create Post
  └─ Publish content to blog
↓
Action: Notion - Update Page
  └─ Set status to "Published"
```

---

## Database Property Types

Notion supports various property types. Here's how to work with them:

### Title Property
```json
{
  "Name": {
    "title": [
      {
        "text": {
          "content": "Page Title"
        }
      }
    ]
  }
}
```

### Rich Text Property
```json
{
  "Description": {
    "rich_text": [
      {
        "text": {
          "content": "Description text"
        }
      }
    ]
  }
}
```

### Select Property
```json
{
  "Status": {
    "select": {
      "name": "In Progress"
    }
  }
}
```

### Multi-Select Property
```json
{
  "Tags": {
    "multi_select": [
      {"name": "urgent"},
      {"name": "backend"}
    ]
  }
}
```

### Date Property
```json
{
  "Due Date": {
    "date": {
      "start": "2024-12-31",
      "end": "2025-01-05"
    }
  }
}
```

### Number Property
```json
{
  "Priority Score": {
    "number": 85
  }
}
```

### Checkbox Property
```json
{
  "Completed": {
    "checkbox": true
  }
}
```

### URL Property
```json
{
  "Website": {
    "url": "https://example.com"
  }
}
```

### Email Property
```json
{
  "Contact Email": {
    "email": "user@example.com"
  }
}
```

### People Property
```json
{
  "Assignee": {
    "people": [
      {"id": "user-id-1"},
      {"id": "user-id-2"}
    ]
  }
}
```

### Relation Property
```json
{
  "Related Projects": {
    "relation": [
      {"id": "page-id-1"},
      {"id": "page-id-2"}
    ]
  }
}
```

---

## Error Handling

The connector automatically handles common errors:

- **401 Unauthorized** - Token expired or invalid
- **404 Not Found** - Page/database doesn't exist or integration lacks access
- **429 Too Many Requests** - Rate limit exceeded (automatic retry)
- **400 Bad Request** - Invalid request format or data

All errors are returned in a standardized format:
```json
{
  "success": false,
  "error": {
    "code": "NOTION_ERROR",
    "message": "Detailed error message",
    "statusCode": 400
  }
}
```

---

## Tips & Best Practices

### 1. Database IDs and Page IDs

Notion IDs are 32-character hexadecimal strings without hyphens:
- ✅ Good: `1234567890abcdef1234567890abcdef`
- ❌ Bad: `123456-7890-abcd-ef12-34567890abcd`

To get IDs:
- Open the database/page in Notion
- Copy the URL
- Extract the ID from the URL (remove hyphens)

### 2. Integration Permissions

Always ensure your integration has access to:
- The specific databases you want to query
- Parent pages where you want to create content

### 3. Rich Text Formatting

Use annotations for text styling:
```json
{
  "text": {
    "content": "Styled text",
    "annotations": {
      "bold": true,
      "italic": true,
      "strikethrough": false,
      "underline": false,
      "code": false,
      "color": "red"
    }
  }
}
```

### 4. Pagination

Always handle pagination for large datasets:
```json
{
  "startCursor": "next_page_cursor",
  "pageSize": 100
}
```

### 5. Filters

Build complex filters using AND/OR logic:
```json
{
  "and": [
    {
      "property": "Status",
      "select": {"equals": "In Progress"}
    },
    {
      "property": "Priority",
      "select": {"equals": "High"}
    }
  ]
}
```

---

## Troubleshooting

### Problem: "Integration doesn't have access"

**Solution:**
1. Open the Notion page/database in your browser
2. Click **"..."** menu → **"Connections"**
3. Add your integration to the page

### Problem: "Invalid database_id"

**Solution:**
- Ensure the ID is exactly 32 characters
- Remove any hyphens from the ID
- Verify the database exists and integration has access

### Problem: "Property not found"

**Solution:**
- Check property names are exact matches (case-sensitive)
- Verify the property exists in the database schema
- Use the `database_get` action to see all available properties

### Problem: "Rate limit exceeded"

**Solution:**
- The connector automatically retries with backoff
- Reduce request frequency
- Batch operations where possible

---

## API Reference

For detailed API documentation, visit:
- [Notion API Reference](https://developers.notion.com/reference)
- [Notion API Changelog](https://developers.notion.com/page/changelog)

---

## Version History

### v1.0.0 (Current)
- ✅ Full database operations (query, create, update, get)
- ✅ Complete page operations (create, update, get)
- ✅ Block operations (append, update, delete, get children)
- ✅ User management
- ✅ Advanced search
- ✅ Polling triggers for page creation and updates
- ✅ OAuth 2.0 support
- ✅ Rate limit handling
- ✅ Comprehensive error handling

---

## Support

For issues or questions:
- Check the [Notion API docs](https://developers.notion.com)
- Review FluxTurn connector documentation
- Contact FluxTurn support

---

**Built with ❤️ for FluxTurn** - Based on n8n's Notion connector implementation and enhanced for FluxTurn's workflow automation platform.
