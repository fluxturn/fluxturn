// Microsoft Teams Connector
// Comprehensive Teams integration based on n8n structure

import { ConnectorDefinition } from '../../shared';

export const TEAMS_CONNECTOR: ConnectorDefinition = {
  name: 'teams',
  display_name: 'Microsoft Teams',
  category: 'communication',
  description: 'Send messages, manage channels, create tasks, and collaborate on Microsoft Teams',
  auth_type: 'multiple',
  auth_fields: [
    {
      key: 'authType',
      label: 'Authentication Type',
      type: 'select',
      required: true,
      options: [
        { label: 'OAuth2 (Recommended)', value: 'oauth2', description: 'Connect with one-click OAuth' },
        { label: 'Custom App Registration', value: 'manual', description: 'Use your own Azure AD app credentials' }
      ],
      default: 'oauth2'
    },
    {
      key: 'tenantId',
      label: 'Tenant ID',
      type: 'string',
      required: true,
      placeholder: 'Your Azure AD Tenant ID',
      displayOptions: { authType: ['manual'] }
    },
    {
      key: 'clientId',
      label: 'Client ID',
      type: 'string',
      required: true,
      placeholder: 'Your Azure AD App Client ID',
      displayOptions: { authType: ['manual'] }
    },
    {
      key: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'Your Azure AD App Client Secret',
      displayOptions: { authType: ['manual'] }
    }
  ],
  endpoints: {
    base_url: 'https://graph.microsoft.com',
    channels: '/v1.0/teams/{teamId}/channels',
    channelMessages: '/beta/teams/{teamId}/channels/{channelId}/messages',
    chatMessages: '/v1.0/chats/{chatId}/messages',
    tasks: '/v1.0/planner/tasks',
    subscriptions: '/v1.0/subscriptions'
  },
  webhook_support: true,
  rate_limits: {
    requests_per_minute: 100,
    requests_per_second: 10
  },
  sandbox_available: false,
  oauth_config: {
    authorization_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    token_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: [
      'Channel.ReadBasic.All',
      'ChannelMessage.Read.All',
      'ChannelMessage.Send',
      'Chat.Read',
      'Chat.ReadWrite',
      'ChatMessage.Read',
      'ChatMessage.Send',
      'Group.Read.All',
      'Group.ReadWrite.All',
      'offline_access',
      'Team.ReadBasic.All',
      'TeamMember.Read.All',
      'User.Read.All'
    ]
  },
  supported_actions: [
    // ==================== CHANNEL OPERATIONS ====================
    {
      id: 'create_channel',
      name: 'Create Channel',
      description: 'Create a new channel in a team',
      category: 'Channel',
      icon: 'plus-circle',
      verified: false,
      api: {
        endpoint: '/v1.0/teams/{teamId}/channels',
        method: 'POST',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          teamId: 'teamId',
          displayName: 'displayName',
          description: 'description',
          membershipType: 'membershipType'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '12345678-1234-1234-1234-123456789abc',
          description: 'The ID of the team to create the channel in',
          aiControlled: false
        },
        displayName: {
          type: 'string',
          required: true,
          label: 'Channel Name',
          inputType: 'text',
          maxLength: 50,
          placeholder: 'General Discussion',
          description: 'The name of the channel',
          aiControlled: true,
          aiDescription: 'The name for the new Teams channel.'
        },
        description: {
          type: 'string',
          required: false,
          label: 'Description',
          inputType: 'textarea',
          maxLength: 1024,
          placeholder: 'Channel for general team discussions',
          description: 'Optional description of the channel',
          aiControlled: true,
          aiDescription: 'A description for the new Teams channel.'
        },
        membershipType: {
          type: 'select',
          required: false,
          label: 'Membership Type',
          default: 'standard',
          options: [
            { label: 'Standard (Public)', value: 'standard' },
            { label: 'Private', value: 'private' }
          ],
          description: 'Whether the channel is public or private',
          aiControlled: false
        }
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'Channel ID'
        },
        displayName: {
          type: 'string',
          description: 'Channel name'
        },
        description: {
          type: 'string',
          description: 'Channel description'
        }
      }
    },
    {
      id: 'get_channel',
      name: 'Get Channel',
      description: 'Get information about a specific channel',
      category: 'Channel',
      icon: 'info',
      verified: false,
      api: {
        endpoint: '/v1.0/teams/{teamId}/channels/{channelId}',
        method: 'GET',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          teamId: 'teamId',
          channelId: 'channelId'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '12345678-1234-1234-1234-123456789abc',
          description: 'The ID of the team',
          aiControlled: false
        },
        channelId: {
          type: 'string',
          required: true,
          label: 'Channel ID',
          placeholder: '19:abcd1234@thread.tacv2',
          description: 'The ID of the channel',
          aiControlled: false
        }
      }
    },
    {
      id: 'list_channels',
      name: 'List Channels',
      description: 'Get all channels in a team',
      category: 'Channel',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/v1.0/teams/{teamId}/channels',
        method: 'GET',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          teamId: 'teamId'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '12345678-1234-1234-1234-123456789abc',
          description: 'The ID of the team',
          aiControlled: false
        }
      }
    },
    {
      id: 'update_channel',
      name: 'Update Channel',
      description: 'Update a channel\'s name or description',
      category: 'Channel',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/v1.0/teams/{teamId}/channels/{channelId}',
        method: 'PATCH',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          teamId: 'teamId',
          channelId: 'channelId',
          displayName: 'displayName',
          description: 'description'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          description: 'The ID of the team',
          aiControlled: false
        },
        channelId: {
          type: 'string',
          required: true,
          label: 'Channel ID',
          description: 'The ID of the channel to update',
          aiControlled: false
        },
        displayName: {
          type: 'string',
          required: false,
          label: 'New Name',
          maxLength: 50,
          description: 'Updated channel name',
          aiControlled: true,
          aiDescription: 'The updated name for the Teams channel.'
        },
        description: {
          type: 'string',
          required: false,
          label: 'New Description',
          inputType: 'textarea',
          maxLength: 1024,
          description: 'Updated channel description',
          aiControlled: true,
          aiDescription: 'The updated description for the Teams channel.'
        }
      }
    },
    {
      id: 'delete_channel',
      name: 'Delete Channel',
      description: 'Delete a channel permanently',
      category: 'Channel',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/v1.0/teams/{teamId}/channels/{channelId}',
        method: 'DELETE',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          teamId: 'teamId',
          channelId: 'channelId'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          description: 'The ID of the team',
          aiControlled: false
        },
        channelId: {
          type: 'string',
          required: true,
          label: 'Channel ID',
          description: 'The ID of the channel to delete',
          aiControlled: false
        }
      }
    },

    // ==================== CHANNEL MESSAGE OPERATIONS ====================
    {
      id: 'send_channel_message',
      name: 'Send Channel Message',
      description: 'Post a message to a Teams channel',
      category: 'Channel Message',
      icon: 'send',
      verified: false,
      api: {
        endpoint: '/beta/teams/{teamId}/channels/{channelId}/messages',
        method: 'POST',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          teamId: 'teamId',
          channelId: 'channelId',
          content: 'body.content',
          contentType: 'body.contentType'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '12345678-1234-1234-1234-123456789abc',
          description: 'The ID of the team',
          aiControlled: false
        },
        channelId: {
          type: 'string',
          required: true,
          label: 'Channel ID',
          placeholder: '19:abcd1234@thread.tacv2',
          description: 'The ID of the channel',
          aiControlled: false
        },
        content: {
          type: 'string',
          required: true,
          label: 'Message',
          inputType: 'textarea',
          placeholder: 'Hello team!',
          description: 'The message content to send',
          aiControlled: true,
          aiDescription: 'The message text to send to the Teams channel.'
        },
        contentType: {
          type: 'select',
          required: false,
          label: 'Content Type',
          default: 'text',
          options: [
            { label: 'Plain Text', value: 'text' },
            { label: 'HTML', value: 'html' }
          ],
          description: 'Format of the message content',
          aiControlled: false
        },
        replyToId: {
          type: 'string',
          required: false,
          label: 'Reply to Message ID',
          description: 'If provided, sends this as a reply to an existing message',
          aiControlled: false
        }
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'Message ID'
        },
        createdDateTime: {
          type: 'string',
          description: 'Timestamp when message was created'
        },
        from: {
          type: 'object',
          description: 'Sender information'
        }
      }
    },
    {
      id: 'list_channel_messages',
      name: 'List Channel Messages',
      description: 'Get messages from a Teams channel',
      category: 'Channel Message',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/beta/teams/{teamId}/channels/{channelId}/messages',
        method: 'GET',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          teamId: 'teamId',
          channelId: 'channelId',
          top: '$top'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          description: 'The ID of the team',
          aiControlled: false
        },
        channelId: {
          type: 'string',
          required: true,
          label: 'Channel ID',
          description: 'The ID of the channel',
          aiControlled: false
        },
        top: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 50,
          min: 1,
          max: 50,
          description: 'Number of messages to retrieve (1-50)',
          aiControlled: false
        }
      }
    },

    // ==================== CHAT MESSAGE OPERATIONS ====================
    {
      id: 'send_chat_message',
      name: 'Send Chat Message',
      description: 'Send a direct message or group chat message',
      category: 'Chat Message',
      icon: 'message-circle',
      verified: false,
      api: {
        endpoint: '/v1.0/chats/{chatId}/messages',
        method: 'POST',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          chatId: 'chatId',
          content: 'body.content',
          contentType: 'body.contentType'
        }
      },
      inputSchema: {
        chatId: {
          type: 'string',
          required: true,
          label: 'Chat ID',
          placeholder: '19:meeting_abc123@thread.v2',
          description: 'The ID of the chat or direct message conversation',
          aiControlled: false
        },
        content: {
          type: 'string',
          required: true,
          label: 'Message',
          inputType: 'textarea',
          placeholder: 'Hello!',
          description: 'The message content to send',
          aiControlled: true,
          aiDescription: 'The message text to send in the chat.'
        },
        contentType: {
          type: 'select',
          required: false,
          label: 'Content Type',
          default: 'text',
          options: [
            { label: 'Plain Text', value: 'text' },
            { label: 'HTML', value: 'html' }
          ],
          description: 'Format of the message content',
          aiControlled: false
        }
      }
    },
    {
      id: 'get_chat_message',
      name: 'Get Chat Message',
      description: 'Get a specific message from a chat',
      category: 'Chat Message',
      icon: 'eye',
      verified: false,
      api: {
        endpoint: '/v1.0/chats/{chatId}/messages/{messageId}',
        method: 'GET',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          chatId: 'chatId',
          messageId: 'messageId'
        }
      },
      inputSchema: {
        chatId: {
          type: 'string',
          required: true,
          label: 'Chat ID',
          description: 'The ID of the chat',
          aiControlled: false
        },
        messageId: {
          type: 'string',
          required: true,
          label: 'Message ID',
          description: 'The ID of the message',
          aiControlled: false
        }
      }
    },
    {
      id: 'list_chat_messages',
      name: 'List Chat Messages',
      description: 'Get all messages from a chat',
      category: 'Chat Message',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/v1.0/chats/{chatId}/messages',
        method: 'GET',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          chatId: 'chatId',
          top: '$top'
        }
      },
      inputSchema: {
        chatId: {
          type: 'string',
          required: true,
          label: 'Chat ID',
          description: 'The ID of the chat',
          aiControlled: false
        },
        top: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 50,
          min: 1,
          max: 50,
          description: 'Number of messages to retrieve (1-50)',
          aiControlled: false
        }
      }
    },

    // ==================== TASK OPERATIONS (PLANNER) ====================
    {
      id: 'create_task',
      name: 'Create Task',
      description: 'Create a task in Microsoft Planner',
      category: 'Task',
      icon: 'check-square',
      verified: false,
      api: {
        endpoint: '/v1.0/planner/tasks',
        method: 'POST',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          planId: 'planId',
          bucketId: 'bucketId',
          title: 'title',
          dueDateTime: 'dueDateTime',
          percentComplete: 'percentComplete'
        }
      },
      inputSchema: {
        planId: {
          type: 'string',
          required: true,
          label: 'Plan ID',
          placeholder: 'oUHpnKBFekqfGE_PS6GGUZcAGABx',
          description: 'The ID of the plan',
          aiControlled: false
        },
        bucketId: {
          type: 'string',
          required: true,
          label: 'Bucket ID',
          placeholder: 'hsOf2dhqikqfGE_PS6GGUZcANd4A',
          description: 'The ID of the bucket (column) to create the task in',
          aiControlled: false
        },
        title: {
          type: 'string',
          required: true,
          label: 'Task Title',
          inputType: 'text',
          placeholder: 'Complete project documentation',
          description: 'The title of the task',
          aiControlled: true,
          aiDescription: 'A clear, concise title for the task.'
        },
        dueDateTime: {
          type: 'string',
          required: false,
          label: 'Due Date',
          inputType: 'text',
          placeholder: '2024-12-31T23:59:59Z',
          description: 'Due date in ISO 8601 format',
          aiControlled: false
        },
        percentComplete: {
          type: 'number',
          required: false,
          label: 'Percent Complete',
          default: 0,
          min: 0,
          max: 100,
          description: 'Task completion percentage (0-100)',
          aiControlled: false
        },
        assignedTo: {
          type: 'string',
          required: false,
          label: 'Assign To User ID',
          description: 'User ID to assign the task to',
          aiControlled: false
        }
      }
    },
    {
      id: 'get_task',
      name: 'Get Task',
      description: 'Get a specific task from Microsoft Planner',
      category: 'Task',
      icon: 'eye',
      verified: false,
      api: {
        endpoint: '/v1.0/planner/tasks/{taskId}',
        method: 'GET',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          taskId: 'taskId'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          description: 'The ID of the task',
          aiControlled: false
        }
      }
    },
    {
      id: 'list_tasks',
      name: 'List Tasks',
      description: 'Get all tasks from a plan or bucket',
      category: 'Task',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/v1.0/planner/plans/{planId}/tasks',
        method: 'GET',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          planId: 'planId'
        }
      },
      inputSchema: {
        planId: {
          type: 'string',
          required: true,
          label: 'Plan ID',
          description: 'The ID of the plan',
          aiControlled: false
        }
      }
    },
    {
      id: 'update_task',
      name: 'Update Task',
      description: 'Update a task in Microsoft Planner',
      category: 'Task',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/v1.0/planner/tasks/{taskId}',
        method: 'PATCH',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {access_token}',
          'If-Match': '{etag}'
        },
        paramMapping: {
          taskId: 'taskId',
          title: 'title',
          percentComplete: 'percentComplete',
          dueDateTime: 'dueDateTime'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          description: 'The ID of the task',
          aiControlled: false
        },
        title: {
          type: 'string',
          required: false,
          label: 'New Title',
          description: 'Updated task title',
          aiControlled: true,
          aiDescription: 'The updated title for the task.'
        },
        percentComplete: {
          type: 'number',
          required: false,
          label: 'Percent Complete',
          min: 0,
          max: 100,
          description: 'Updated completion percentage',
          aiControlled: false
        },
        dueDateTime: {
          type: 'string',
          required: false,
          label: 'Due Date',
          description: 'Updated due date in ISO 8601 format',
          aiControlled: false
        }
      }
    },
    {
      id: 'delete_task',
      name: 'Delete Task',
      description: 'Delete a task from Microsoft Planner',
      category: 'Task',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/v1.0/planner/tasks/{taskId}',
        method: 'DELETE',
        baseUrl: 'https://graph.microsoft.com',
        headers: {
          'Authorization': 'Bearer {access_token}',
          'If-Match': '{etag}'
        },
        paramMapping: {
          taskId: 'taskId'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          description: 'The ID of the task to delete',
          aiControlled: false
        }
      }
    }
  ],
  supported_triggers: [
    {
      id: 'new_channel',
      name: 'New Channel',
      description: 'Triggers when a new channel is created in a team',
      eventType: 'channel.created',
      verified: false,
      icon: 'plus-circle',
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        id: {
          type: 'string',
          description: 'Channel ID'
        },
        displayName: {
          type: 'string',
          description: 'Channel name'
        },
        description: {
          type: 'string',
          description: 'Channel description'
        },
        createdDateTime: {
          type: 'string',
          description: 'Creation timestamp'
        }
      }
    },
    {
      id: 'new_channel_message',
      name: 'New Channel Message',
      description: 'Triggers when a new message is posted to a channel',
      eventType: 'channelMessage.created',
      verified: false,
      icon: 'message-square',
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          description: 'The ID of the team to monitor'
        },
        channelId: {
          type: 'string',
          required: false,
          label: 'Channel ID (Optional)',
          description: 'Specific channel to monitor, or leave empty for all channels'
        }
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'Message ID'
        },
        from: {
          type: 'object',
          description: 'Sender information'
        },
        body: {
          type: 'object',
          description: 'Message content'
        },
        createdDateTime: {
          type: 'string',
          description: 'Timestamp'
        }
      }
    },
    {
      id: 'new_chat_message',
      name: 'New Chat Message',
      description: 'Triggers when a new direct/chat message is received',
      eventType: 'chatMessage.created',
      verified: false,
      icon: 'message-circle',
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        id: {
          type: 'string',
          description: 'Message ID'
        },
        chatId: {
          type: 'string',
          description: 'Chat ID'
        },
        from: {
          type: 'object',
          description: 'Sender information'
        },
        body: {
          type: 'object',
          description: 'Message content'
        },
        createdDateTime: {
          type: 'string',
          description: 'Timestamp'
        }
      }
    },
    {
      id: 'new_team_member',
      name: 'New Team Member',
      description: 'Triggers when a new member joins a team',
      eventType: 'teamMember.added',
      verified: false,
      icon: 'user-plus',
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          description: 'The ID of the team to monitor'
        }
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'Member ID'
        },
        displayName: {
          type: 'string',
          description: 'Member name'
        },
        email: {
          type: 'string',
          description: 'Member email'
        },
        roles: {
          type: 'array',
          description: 'Member roles'
        }
      }
    }
  ]
};
