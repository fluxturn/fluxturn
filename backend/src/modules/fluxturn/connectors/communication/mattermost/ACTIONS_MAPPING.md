# Mattermost Actions Mapping - n8n to Fluxturn

This document shows how all n8n Mattermost operations were converted to Fluxturn actions.

## Channel Resource (7 Actions)

### 1. Create Channel
- **n8n Operation**: `channel.create`
- **Fluxturn Action**: `create_channel`
- **Method**: POST `/channels`
- **Required Fields**: teamId, name, displayName, type
- **Optional Fields**: None
- **n8n Fields Mapped**:
  - teamId → team_id
  - name → name
  - displayName → display_name
  - type → type (O=public, P=private)

### 2. Delete Channel
- **n8n Operation**: `channel.delete`
- **Fluxturn Action**: `delete_channel`
- **Method**: DELETE `/channels/{channelId}`
- **Required Fields**: channelId
- **Note**: Soft delete operation

### 3. Restore Channel
- **n8n Operation**: `channel.restore`
- **Fluxturn Action**: `restore_channel`
- **Method**: POST `/channels/{channelId}/restore`
- **Required Fields**: channelId
- **Note**: Restores soft-deleted channels

### 4. Add User to Channel
- **n8n Operation**: `channel.addUser`
- **Fluxturn Action**: `add_user_to_channel`
- **Method**: POST `/channels/{channelId}/members`
- **Required Fields**: channelId, userId
- **n8n Fields Mapped**:
  - userId → user_id

### 5. Get Channel Members
- **n8n Operation**: `channel.members`
- **Fluxturn Action**: `get_channel_members`
- **Method**: GET `/channels/{channelId}/members`
- **Required Fields**: channelId
- **Returns**: Array of channel members

### 6. Search Channels
- **n8n Operation**: `channel.search`
- **Fluxturn Action**: `search_channels`
- **Method**: POST `/teams/{teamId}/channels/search`
- **Required Fields**: teamId, term
- **n8n Fields Mapped**:
  - term → term

### 7. Get Channel Statistics
- **n8n Operation**: `channel.statistics`
- **Fluxturn Action**: `get_channel_statistics`
- **Method**: GET `/channels/{channelId}/stats`
- **Required Fields**: channelId
- **Returns**: member_count, channel_id

## Message Resource (3 Actions)

### 8. Post Message
- **n8n Operation**: `message.post`
- **Fluxturn Action**: `post_message`
- **Method**: POST `/posts`
- **Required Fields**: channelId, message
- **Optional Fields**: rootId (for threaded replies)
- **n8n Fields Mapped**:
  - channelId → channel_id
  - message → message
  - rootId → root_id
- **n8n Features Included**:
  - Basic message posting
  - Threaded replies via rootId
- **n8n Features Excluded**:
  - Attachments (complex nested structure)
  - Actions (interactive messages)
- **Note**: Simplified from n8n's complex attachment schema

### 9. Post Ephemeral Message
- **n8n Operation**: `message.postEphemeral`
- **Fluxturn Action**: `post_ephemeral_message`
- **Method**: POST `/posts/ephemeral`
- **Required Fields**: userId, channelId, message
- **n8n Fields Mapped**:
  - userId → user_id
  - channelId → channel_id
  - message → message
- **Note**: Message visible only to specified user

### 10. Delete Message
- **n8n Operation**: `message.delete`
- **Fluxturn Action**: `delete_message`
- **Method**: DELETE `/posts/{postId}`
- **Required Fields**: postId

## Reaction Resource (3 Actions)

### 11. Create Reaction
- **n8n Operation**: `reaction.create`
- **Fluxturn Action**: `create_reaction`
- **Method**: POST `/reactions`
- **Required Fields**: userId, postId, emojiName
- **n8n Fields Mapped**:
  - userId → user_id
  - postId → post_id
  - emojiName → emoji_name

### 12. Delete Reaction
- **n8n Operation**: `reaction.delete`
- **Fluxturn Action**: `delete_reaction`
- **Method**: DELETE `/users/{userId}/posts/{postId}/reactions/{emojiName}`
- **Required Fields**: userId, postId, emojiName

### 13. Get All Reactions
- **n8n Operation**: `reaction.getAll`
- **Fluxturn Action**: `get_all_reactions`
- **Method**: GET `/posts/{postId}/reactions`
- **Required Fields**: postId
- **Returns**: Array of reactions for the post

## User Resource (6 Actions)

### 14. Create User
- **n8n Operation**: `user.create`
- **Fluxturn Action**: `create_user`
- **Method**: POST `/users`
- **Required Fields**: username, email, password
- **Optional Fields**: firstName, lastName, nickname, locale
- **n8n Fields Mapped**:
  - username → username
  - email → email
  - password → password
  - firstName → first_name
  - lastName → last_name
  - nickname → nickname
  - locale → locale
- **n8n Features Excluded**:
  - authService (email/gitlab/google/ldap/office365/saml)
  - authData
  - notificationSettings (complex nested structure)
- **Note**: Simplified to basic user creation with email auth

### 15. Deactivate User
- **n8n Operation**: `user.deactive`
- **Fluxturn Action**: `deactivate_user`
- **Method**: DELETE `/users/{userId}`
- **Required Fields**: userId
- **Note**: Archives user and revokes all sessions

### 16. Get User by ID
- **n8n Operation**: `user.getById`
- **Fluxturn Action**: `get_user_by_id`
- **Method**: GET `/users/{userId}`
- **Required Fields**: userId

### 17. Get User by Email
- **n8n Operation**: `user.getByEmail`
- **Fluxturn Action**: `get_user_by_email`
- **Method**: GET `/users/email/{email}`
- **Required Fields**: email

### 18. Get All Users
- **n8n Operation**: `user.getAll`
- **Fluxturn Action**: `get_all_users`
- **Method**: GET `/users`
- **Optional Fields**: page (default: 0), perPage (default: 60)
- **Note**: Supports pagination

### 19. Invite User to Team
- **n8n Operation**: `user.invite`
- **Fluxturn Action**: `invite_user_to_team`
- **Method**: POST `/teams/{teamId}/invite/email`
- **Required Fields**: teamId, email
- **Note**: Sends email invitation to join team

## Summary Statistics

| Category | n8n Operations | Fluxturn Actions | Coverage |
|----------|---------------|------------------|----------|
| Channel | 7 | 7 | 100% |
| Message | 3 | 3 | 100% |
| Reaction | 3 | 3 | 100% |
| User | 6 | 6 | 100% |
| **Total** | **19** | **19** | **100%** |

## Authentication Mapping

### n8n Credentials
```typescript
{
  accessToken: string;      // Password field
  baseUrl: string;          // String field
  allowUnauthorizedCerts: boolean;  // SSL validation
}
```

### Fluxturn Auth Fields
```typescript
{
  accessToken: {
    type: 'password',
    required: true,
    label: 'Access Token'
  },
  baseUrl: {
    type: 'string',
    required: true,
    label: 'Base URL'
  }
  // Note: SSL validation not implemented
}
```

### Auth Header
- **n8n**: `Authorization: Bearer {{$credentials.accessToken}}`
- **Fluxturn**: `Authorization: Bearer {accessToken}`

## API Endpoints

### Base URL Construction
- **n8n**: `{{$credentials.baseUrl.replace(/\\/$/, "")}}/api/v4`
- **Fluxturn**: `{baseUrl}/api/v4` (trailing slash removed in connector)

### Endpoint Mapping
All endpoints match exactly between n8n and Fluxturn:

| Resource | Endpoint Pattern |
|----------|-----------------|
| Channels | `/channels`, `/channels/{id}` |
| Messages | `/posts`, `/posts/{id}`, `/posts/ephemeral` |
| Reactions | `/reactions`, `/posts/{postId}/reactions` |
| Users | `/users`, `/users/{id}`, `/users/email/{email}` |
| Teams | `/teams/{teamId}/channels/search`, `/teams/{teamId}/invite/email` |

## Field Type Mappings

| n8n Type | Fluxturn Type | Notes |
|----------|---------------|-------|
| string | string | Direct mapping |
| number | number | Direct mapping |
| boolean | boolean | Direct mapping |
| options | select | Options array converted |
| collection | object | Simplified or excluded |
| fixedCollection | array/object | Complex structures simplified |

## Simplifications Made

### 1. Message Attachments (Excluded)
n8n supports complex attachment structures with:
- Actions (buttons, selects)
- Fields (title, value, short)
- Author info (name, link, icon)
- Images and thumbnails
- Interactive components

**Reason**: Very complex nested structure not suitable for basic action definition format.

### 2. User Notification Settings (Excluded)
n8n supports detailed notification preferences:
- Channel notifications
- Desktop notifications with sound
- Email notifications
- Push notifications
- Mention keys

**Reason**: Complex nested structure for advanced user configuration.

### 3. User Auth Service Options (Excluded)
n8n supports multiple authentication methods:
- email, gitlab, google, ldap, office365, saml

**Reason**: Simplified to email-based authentication only for core functionality.

### 4. SSL Certificate Validation (Excluded)
n8n includes `allowUnauthorizedCerts` option.

**Reason**: Security best practice - always validate SSL certificates.

## Implementation Notes

1. **All Core Operations Covered**: Every essential Mattermost operation from n8n is available in Fluxturn.

2. **Simplified Schema**: Complex nested structures were simplified while maintaining core functionality.

3. **Consistent Patterns**: All actions follow the exact same pattern as Clockify connector.

4. **Type Safety**: Full TypeScript typing throughout the implementation.

5. **Error Handling**: Proper error handling and response formatting.

6. **Documentation**: Comprehensive descriptions for all fields and actions.

## Testing Recommendations

1. **Connection Test**: Verify access token and base URL with GET `/users/me`
2. **Channel Operations**: Test create, delete, restore cycle
3. **Message Operations**: Test posting, ephemeral messages, deletion
4. **Reaction Operations**: Test add, get, remove reactions
5. **User Operations**: Test user CRUD operations and team invitations

## Future Enhancements

Potential additions for future versions:

1. **Message Attachments**: Add support for rich message formatting
2. **Interactive Messages**: Support buttons and select menus
3. **File Uploads**: Add file attachment support
4. **Webhooks**: Implement webhook triggers for events
5. **Advanced User Settings**: Add notification preferences
6. **Team Management**: Add team CRUD operations
7. **Direct Messages**: Add DM channel operations
