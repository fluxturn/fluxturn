import { ConnectorDefinition } from '../../shared';

export const MATRIX_CONNECTOR: ConnectorDefinition = {
  name: 'matrix',
  display_name: 'Matrix',
  category: 'communication',
  description: 'Decentralized communication platform for secure messaging and collaboration',
  auth_type: 'bearer_token',
  verified: false,

  auth_fields: [
    {
      key: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Matrix access token',
      description: 'Your Matrix access token for authentication',
      helpUrl: 'https://matrix.org/docs/guides/client-server-api',
      helpText: 'How to get your access token',
    },
    {
      key: 'homeserverUrl',
      label: 'Homeserver URL',
      type: 'string',
      required: true,
      placeholder: 'https://matrix-client.matrix.org',
      description: 'URL of your Matrix homeserver',
      default: 'https://matrix-client.matrix.org',
    },
  ],

  endpoints: {
    base_url: '{homeserverUrl}/_matrix/client/r0',
    media_url: '{homeserverUrl}/_matrix/media/r0',
    account: '/account/whoami',
    rooms: '/createRoom',
    messages: '/rooms/{roomId}/messages',
    joined_rooms: '/joined_rooms',
    events: '/rooms/{roomId}/event/{eventId}',
    room_members: '/rooms/{roomId}/members',
  },

  webhook_support: false,

  rate_limits: {
    requests_per_second: 10,
  },

  supported_actions: [
    // Account Actions
    {
      id: 'get_account_info',
      name: 'Get Account Info',
      description: 'Get current user account information',
      category: 'Account',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/account/whoami',
        method: 'GET',
        baseUrl: '{homeserverUrl}/_matrix/client/r0',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {},
      outputSchema: {
        user_id: {
          type: 'string',
          description: 'The user ID',
        },
      },
    },
    // Message Actions
    {
      id: 'send_message',
      name: 'Send Message',
      description: 'Send a message to a room',
      category: 'Message',
      icon: 'send',
      verified: false,
      api: {
        endpoint: '/rooms/{roomId}/send/m.room.message/{messageId}',
        method: 'PUT',
        baseUrl: '{homeserverUrl}/_matrix/client/r0',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          roomId: 'roomId',
          text: 'body',
          messageType: 'msgtype',
          messageFormat: 'format',
          fallbackText: 'body',
          formattedBody: 'formatted_body',
        },
      },
      inputSchema: {
        roomId: {
          type: 'string',
          required: true,
          label: 'Room ID',
          placeholder: '!123abc:matrix.org',
          description: 'The room to send the message to',
          aiControlled: false,
        },
        text: {
          type: 'string',
          required: true,
          label: 'Message Text',
          inputType: 'textarea',
          placeholder: 'Hello from Fluxturn!',
          description: 'The text to send',
          aiControlled: true,
          aiDescription: 'The message content to send to the Matrix room',
        },
        messageType: {
          type: 'select',
          required: false,
          label: 'Message Type',
          default: 'm.text',
          options: [
            { label: 'Text', value: 'm.text' },
            { label: 'Notice', value: 'm.notice' },
            { label: 'Emote', value: 'm.emote' },
          ],
          description: 'The type of message to send',
          aiControlled: false,
        },
        messageFormat: {
          type: 'select',
          required: false,
          label: 'Message Format',
          default: 'plain',
          options: [
            { label: 'Plain Text', value: 'plain' },
            { label: 'HTML', value: 'org.matrix.custom.html' },
          ],
          description: 'The format of the message body',
          aiControlled: false,
        },
        fallbackText: {
          type: 'string',
          required: false,
          label: 'Fallback Text',
          inputType: 'textarea',
          description: 'Plain text to display if HTML cannot be rendered (only for HTML format)',
          displayOptions: {
            show: {
              messageFormat: ['org.matrix.custom.html'],
            },
          },
          aiControlled: true,
          aiDescription: 'Plain text fallback content when HTML cannot be rendered',
        },
      },
      outputSchema: {
        event_id: { type: 'string', description: 'The event ID' },
      },
    },
    {
      id: 'get_messages',
      name: 'Get Messages',
      description: 'Get messages from a room',
      category: 'Message',
      icon: 'message-circle',
      verified: false,
      api: {
        endpoint: '/rooms/{roomId}/messages',
        method: 'GET',
        baseUrl: '{homeserverUrl}/_matrix/client/r0',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        roomId: {
          type: 'string',
          required: true,
          label: 'Room ID',
          placeholder: '!123abc:matrix.org',
          description: 'The room to get messages from',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100,
          min: 1,
          max: 500,
          description: 'Maximum number of messages to return',
          aiControlled: false,
        },
        filter: {
          type: 'string',
          required: false,
          label: 'Filter',
          placeholder: '{"contains_url":true,"types":["m.room.message"]}',
          description: 'A JSON RoomEventFilter to filter returned events',
          aiControlled: false,
        },
      },
      outputSchema: {
        messages: {
          type: 'array',
          description: 'List of messages',
        },
      },
    },
    // Room Actions
    {
      id: 'create_room',
      name: 'Create Room',
      description: 'Create a new chat room',
      category: 'Room',
      icon: 'folder',
      verified: false,
      api: {
        endpoint: '/createRoom',
        method: 'POST',
        baseUrl: '{homeserverUrl}/_matrix/client/r0',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          roomName: 'name',
          preset: 'preset',
          roomAlias: 'room_alias_name',
        },
      },
      inputSchema: {
        roomName: {
          type: 'string',
          required: true,
          label: 'Room Name',
          placeholder: 'My new room',
          description: 'The name of the room',
          aiControlled: true,
          aiDescription: 'The name for the new Matrix room',
        },
        preset: {
          type: 'select',
          required: true,
          label: 'Preset',
          default: 'public_chat',
          options: [
            { label: 'Private Chat', value: 'private_chat' },
            { label: 'Public Chat', value: 'public_chat' },
          ],
          description: 'Room visibility preset',
          aiControlled: false,
        },
        roomAlias: {
          type: 'string',
          required: false,
          label: 'Room Alias',
          placeholder: 'coolest-room-around',
          description: 'Alias for the room (optional)',
          aiControlled: false,
        },
      },
      outputSchema: {
        room_id: { type: 'string', description: 'The created room ID' },
      },
    },
    {
      id: 'join_room',
      name: 'Join Room',
      description: 'Join a room',
      category: 'Room',
      icon: 'log-in',
      verified: false,
      api: {
        endpoint: '/rooms/{roomIdOrAlias}/join',
        method: 'POST',
        baseUrl: '{homeserverUrl}/_matrix/client/r0',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        roomIdOrAlias: {
          type: 'string',
          required: true,
          label: 'Room ID or Alias',
          placeholder: '!abc123:matrix.org or #room:matrix.org',
          description: 'The room ID or alias to join',
          aiControlled: false,
        },
      },
      outputSchema: {
        room_id: { type: 'string', description: 'The joined room ID' },
      },
    },
    {
      id: 'leave_room',
      name: 'Leave Room',
      description: 'Leave a room',
      category: 'Room',
      icon: 'log-out',
      verified: false,
      api: {
        endpoint: '/rooms/{roomId}/leave',
        method: 'POST',
        baseUrl: '{homeserverUrl}/_matrix/client/r0',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        roomId: {
          type: 'string',
          required: true,
          label: 'Room ID',
          placeholder: '!123abc:matrix.org',
          description: 'The room to leave',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },
    {
      id: 'invite_user',
      name: 'Invite User',
      description: 'Invite a user to a room',
      category: 'Room',
      icon: 'user-plus',
      verified: false,
      api: {
        endpoint: '/rooms/{roomId}/invite',
        method: 'POST',
        baseUrl: '{homeserverUrl}/_matrix/client/r0',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          userId: 'user_id',
        },
      },
      inputSchema: {
        roomId: {
          type: 'string',
          required: true,
          label: 'Room ID',
          placeholder: '!123abc:matrix.org',
          description: 'The room to invite the user to',
          aiControlled: false,
        },
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          placeholder: '@cheeky_monkey:matrix.org',
          description: 'The fully qualified user ID of the invitee',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },
    {
      id: 'kick_user',
      name: 'Kick User',
      description: 'Kick a user from a room',
      category: 'Room',
      icon: 'user-minus',
      verified: false,
      api: {
        endpoint: '/rooms/{roomId}/kick',
        method: 'POST',
        baseUrl: '{homeserverUrl}/_matrix/client/r0',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          userId: 'user_id',
          reason: 'reason',
        },
      },
      inputSchema: {
        roomId: {
          type: 'string',
          required: true,
          label: 'Room ID',
          placeholder: '!123abc:matrix.org',
          description: 'The room to kick the user from',
          aiControlled: false,
        },
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          placeholder: '@cheeky_monkey:matrix.org',
          description: 'The fully qualified user ID to kick',
          aiControlled: false,
        },
        reason: {
          type: 'string',
          required: false,
          label: 'Reason',
          placeholder: 'Telling unfunny jokes',
          description: 'Reason for kicking the user',
          aiControlled: true,
          aiDescription: 'The reason message for kicking the user from the room',
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },
    // Event Actions
    {
      id: 'get_event',
      name: 'Get Event',
      description: 'Get a single event by ID',
      category: 'Event',
      icon: 'activity',
      verified: false,
      api: {
        endpoint: '/rooms/{roomId}/event/{eventId}',
        method: 'GET',
        baseUrl: '{homeserverUrl}/_matrix/client/r0',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        roomId: {
          type: 'string',
          required: true,
          label: 'Room ID',
          placeholder: '!123abc:matrix.org',
          description: 'The room containing the event',
          aiControlled: false,
        },
        eventId: {
          type: 'string',
          required: true,
          label: 'Event ID',
          placeholder: '$1234abcd:matrix.org',
          description: 'The event ID to retrieve',
          aiControlled: false,
        },
      },
      outputSchema: {
        event: { type: 'object', description: 'The event data' },
      },
    },
    // Room Member Actions
    {
      id: 'get_room_members',
      name: 'Get Room Members',
      description: 'Get members of a room',
      category: 'Room Member',
      icon: 'users',
      verified: false,
      api: {
        endpoint: '/rooms/{roomId}/members',
        method: 'GET',
        baseUrl: '{homeserverUrl}/_matrix/client/r0',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        roomId: {
          type: 'string',
          required: true,
          label: 'Room ID',
          placeholder: '!123abc:matrix.org',
          description: 'The room to get members from',
          aiControlled: false,
        },
        membership: {
          type: 'select',
          required: false,
          label: 'Membership',
          default: '',
          options: [
            { label: 'Any', value: '' },
            { label: 'Join', value: 'join' },
            { label: 'Invite', value: 'invite' },
            { label: 'Leave', value: 'leave' },
            { label: 'Ban', value: 'ban' },
          ],
          description: 'Filter by membership status',
          aiControlled: false,
        },
        notMembership: {
          type: 'select',
          required: false,
          label: 'Exclude Membership',
          default: '',
          options: [
            { label: 'Any', value: '' },
            { label: 'Join', value: 'join' },
            { label: 'Invite', value: 'invite' },
            { label: 'Leave', value: 'leave' },
            { label: 'Ban', value: 'ban' },
          ],
          description: 'Exclude members with this membership status',
          aiControlled: false,
        },
      },
      outputSchema: {
        members: {
          type: 'array',
          description: 'List of room members',
        },
      },
    },
    // Media Actions
    {
      id: 'upload_media',
      name: 'Upload Media',
      description: 'Upload media to a chat room',
      category: 'Media',
      icon: 'image',
      verified: false,
      api: {
        endpoint: '/upload',
        method: 'POST',
        baseUrl: '{homeserverUrl}/_matrix/media/r0',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        roomId: {
          type: 'string',
          required: true,
          label: 'Room ID',
          placeholder: '!123abc:matrix.org',
          description: 'The room to upload media to',
          aiControlled: false,
        },
        mediaType: {
          type: 'select',
          required: true,
          label: 'Media Type',
          default: 'image',
          options: [
            { label: 'File', value: 'file' },
            { label: 'Image', value: 'image' },
            { label: 'Audio', value: 'audio' },
            { label: 'Video', value: 'video' },
          ],
          description: 'Type of media being uploaded',
          aiControlled: false,
        },
        binaryData: {
          type: 'string',
          required: true,
          label: 'Binary Property Name',
          default: 'data',
          description: 'The name of the binary property containing the file',
          aiControlled: false,
        },
        fileName: {
          type: 'string',
          required: false,
          label: 'File Name',
          placeholder: 'image.png',
          description: 'Name of the file being uploaded',
          aiControlled: false,
        },
      },
      outputSchema: {
        content_uri: {
          type: 'string',
          description: 'The MXC URI of the uploaded media',
        },
        event_id: {
          type: 'string',
          description: 'The event ID of the message',
        },
      },
    },
  ],

  supported_triggers: [],
};
