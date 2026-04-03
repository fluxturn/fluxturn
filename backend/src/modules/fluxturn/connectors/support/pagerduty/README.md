# PagerDuty Connector for Fluxturn

This connector provides integration with PagerDuty's incident management platform.

## Source

Imported from n8n: `/packages/nodes-base/nodes/PagerDuty/`

## Authentication

PagerDuty supports two authentication methods:

1. **API Token** (Primary)
   - Simple token-based authentication
   - Configuration: `apiToken`
   - Header: `Authorization: Token token={apiToken}`

2. **OAuth2** (Alternative)
   - OAuth2 bearer token authentication
   - Configuration: `accessToken`
   - Header: `Authorization: Bearer {accessToken}`

## Category

**Support** - Incident Management (`ConnectorCategory.SUPPORT`)

## Features

### Resources

1. **Incident** - Manage incidents
2. **Incident Note** - Add notes to incidents
3. **Log Entry** - View log entries
4. **User** - Get user information

### Actions Implemented

#### Incidents (4 actions)
- `incident_create` - Create a new incident
- `incident_get` - Get an incident by ID
- `incident_get_all` - Get many incidents with filtering
- `incident_update` - Update an existing incident

#### Incident Notes (2 actions)
- `incident_note_create` - Create a note on an incident
- `incident_note_get_all` - Get all notes for an incident

#### Log Entries (2 actions)
- `log_entry_get` - Get a log entry by ID
- `log_entry_get_all` - Get many log entries

#### Users (1 action)
- `user_get` - Get a user by ID

**Total: 9 comprehensive actions**

## Implementation Details

### Key Features

1. **No Private Logger** - Uses inherited logger from BaseConnector
2. **executeRequest() Pattern** - Uses `performRequest()` method
3. **Comprehensive Filtering** - Full support for PagerDuty's query parameters
4. **Pagination Support** - Automatic pagination for "get all" operations
5. **Conference Bridge** - Support for conference bridge details in incidents
6. **Snake Case Conversion** - Automatic conversion for API compatibility

### API Endpoint

Base URL: `https://api.pagerduty.com`

API Version: 2 (via Accept header: `application/vnd.pagerduty+json;version=2`)

### Rate Limits

- Requests per minute: 960
- Requests per second: ~10

### Webhook Support

Yes - PagerDuty supports webhooks for:
- Incident triggered
- Incident acknowledged
- Incident resolved

## Files Structure

```
pagerduty/
├── index.ts                    # Module exports
├── pagerduty.connector.ts      # Main connector implementation (843 lines)
├── pagerduty.definition.ts     # Connector definition (470 lines)
├── n8n-reference/              # Original n8n source files
│   ├── PagerDuty.node.ts
│   ├── GenericFunctions.ts
│   ├── IncidentDescription.ts
│   ├── IncidentNoteDescription.ts
│   ├── LogEntryDescription.ts
│   ├── UserDescription.ts
│   ├── IncidentInterface.ts
│   ├── PagerDuty.node.json
│   └── pagerDuty.svg
└── README.md                   # This file
```

## Usage Example

```typescript
// Create an incident
const result = await connector.createTicket({
  title: 'Production server down',
  serviceId: 'PXXXXXX',
  email: 'admin@example.com',
  urgency: 'high',
  details: 'Server not responding to health checks'
});

// Get all high urgency incidents
const incidents = await connector.getTickets({
  urgencies: ['high'],
  statuses: ['triggered', 'acknowledged'],
  limit: 50
});

// Update an incident
await connector.updateTicket('INCXXXX', {
  email: 'admin@example.com',
  status: 'acknowledged',
  resolution: 'Investigating the issue'
});

// Add a note to an incident
await connector.addComment('INCXXXX', {
  email: 'admin@example.com',
  content: 'Identified root cause: disk space issue'
});
```

## Special Features

### Incident Creation
- Service reference with type validation
- Priority and escalation policy support
- Conference bridge integration
- Incident key for deduplication
- Urgency levels (high/low)

### Incident Filtering (Get All)
- Date range filtering (since/until)
- Status filtering (triggered/acknowledged/resolved)
- Urgency filtering
- User and team filtering
- Service filtering
- Include related data
- Timezone support
- Custom sorting

### Log Entry Filtering
- Date range support
- Include channels, incidents, services, teams
- Overview mode for important changes only

## API Reference

PagerDuty API Documentation: https://developer.pagerduty.com/api-reference/

## Implementation Notes

1. **Authentication Header**: Uses `From` header for email-based operations
2. **Pagination**: Implements offset-based pagination with `limit` and `offset`
3. **Type References**: Proper type references for services, priorities, escalation policies
4. **Error Handling**: Comprehensive error handling with PagerDuty error codes
5. **ISupportConnector**: Implements the support connector interface

## Testing

Connection test uses the `/abilities` endpoint (lightweight).

## Migration from n8n

All operations from the n8n PagerDuty node have been implemented:
- ✅ Incident: create, get, getAll, update
- ✅ Incident Note: create, getAll
- ✅ Log Entry: get, getAll
- ✅ User: get

## Dependencies

- axios - HTTP client
- BaseConnector - Fluxturn base connector class
- ISupportConnector - Support category interface
- AuthUtils & ApiUtils - Utility services
