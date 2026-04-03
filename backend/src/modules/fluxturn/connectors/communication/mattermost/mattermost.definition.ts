import { ConnectorDefinition } from '../../shared';

export const MATTERMOST_CONNECTOR: ConnectorDefinition = {
  name: 'mattermost',
  display_name: 'Mattermost',
  category: 'communication',
  description: 'Team collaboration and messaging platform for secure communication',
  auth_type: 'bearer_token',
  verified: false,

  auth_fields: [
    {
      key: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Mattermost access token',
      description: 'Your Mattermost personal access token',
      helpUrl: 'https://docs.mattermost.com/developer/personal-access-tokens.html',
      helpText: 'How to create a personal access token',
    },
    {
      key: 'baseUrl',
      label: 'Base URL',
      type: 'string',
      required: true,
      placeholder: 'https://your-mattermost-server.com',
      description: 'The base URL of your Mattermost server',
    },
  ],

  endpoints: {
    base_url: '{baseUrl}/api/v4',
    channels: '/channels',
    posts: '/posts',
    users: '/users',
    teams: '/teams',
    reactions: '/reactions',
  },

  webhook_support: false,

  rate_limits: {
    requests_per_second: 10,
  },

  supported_actions: [
    // Channel Actions
    {
      id: 'create_channel',
      name: 'Create Channel',
      description: 'Create a new channel',
      category: 'Channel',
      icon: 'hash',
      verified: false,
      api: {
        endpoint: '/channels',
        method: 'POST',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          teamId: 'team_id',
          name: 'name',
          displayName: 'display_name',
          type: 'type',
        },
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          description: 'The ID of the team to create the channel in',
          aiControlled: false,
        },
        name: {
          type: 'string',
          required: true,
          label: 'Channel Name',
          placeholder: 'announcements',
          description: 'The unique handle for the channel (used in URL)',
          aiControlled: false,
        },
        displayName: {
          type: 'string',
          required: true,
          label: 'Display Name',
          placeholder: 'Announcements',
          description: 'The display name for the channel',
          aiControlled: false,
        },
        type: {
          type: 'select',
          required: true,
          label: 'Channel Type',
          default: 'O',
          options: [
            { label: 'Public', value: 'O' },
            { label: 'Private', value: 'P' },
          ],
          description: 'The type of channel to create',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string', description: 'Channel ID' },
        name: { type: 'string' },
        display_name: { type: 'string' },
        type: { type: 'string' },
      },
    },
    {
      id: 'delete_channel',
      name: 'Delete Channel',
      description: 'Soft delete a channel',
      category: 'Channel',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/channels/{channelId}',
        method: 'DELETE',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        channelId: {
          type: 'string',
          required: true,
          label: 'Channel ID',
          description: 'The ID of the channel to delete',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },
    {
      id: 'restore_channel',
      name: 'Restore Channel',
      description: 'Restore a soft-deleted channel',
      category: 'Channel',
      icon: 'refresh',
      verified: false,
      api: {
        endpoint: '/channels/{channelId}/restore',
        method: 'POST',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        channelId: {
          type: 'string',
          required: true,
          label: 'Channel ID',
          description: 'The ID of the channel to restore',
          aiControlled: false,
        },
      },
      outputSchema: {
        channel: { type: 'object' },
      },
    },
    {
      id: 'add_user_to_channel',
      name: 'Add User to Channel',
      description: 'Add a user to a channel',
      category: 'Channel',
      icon: 'user-plus',
      verified: false,
      api: {
        endpoint: '/channels/{channelId}/members',
        method: 'POST',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          userId: 'user_id',
        },
      },
      inputSchema: {
        channelId: {
          type: 'string',
          required: true,
          label: 'Channel ID',
          description: 'The ID of the channel',
          aiControlled: false,
        },
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'The ID of the user to add',
          aiControlled: false,
        },
      },
      outputSchema: {
        channel_id: { type: 'string' },
        user_id: { type: 'string' },
      },
    },
    {
      id: 'get_channel_members',
      name: 'Get Channel Members',
      description: 'Get a page of members for a channel',
      category: 'Channel',
      icon: 'users',
      verified: false,
      api: {
        endpoint: '/channels/{channelId}/members',
        method: 'GET',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        channelId: {
          type: 'string',
          required: true,
          label: 'Channel ID',
          description: 'The ID of the channel',
          aiControlled: false,
        },
      },
      outputSchema: {
        members: { type: 'array', description: 'List of channel members' },
      },
    },
    {
      id: 'search_channels',
      name: 'Search Channels',
      description: 'Search for channels',
      category: 'Channel',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/teams/{teamId}/channels/search',
        method: 'POST',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          term: 'term',
        },
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          description: 'The ID of the team to search in',
          aiControlled: false,
        },
        term: {
          type: 'string',
          required: true,
          label: 'Search Term',
          description: 'The search term to match channel names',
          aiControlled: false,
        },
      },
      outputSchema: {
        channels: { type: 'array' },
      },
    },
    {
      id: 'get_channel_statistics',
      name: 'Get Channel Statistics',
      description: 'Get statistics for a channel',
      category: 'Channel',
      icon: 'bar-chart',
      verified: false,
      api: {
        endpoint: '/channels/{channelId}/stats',
        method: 'GET',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        channelId: {
          type: 'string',
          required: true,
          label: 'Channel ID',
          description: 'The ID of the channel',
          aiControlled: false,
        },
      },
      outputSchema: {
        member_count: { type: 'number' },
        channel_id: { type: 'string' },
      },
    },
    // Message Actions
    {
      id: 'post_message',
      name: 'Post Message',
      description: 'Post a message to a channel',
      category: 'Message',
      icon: 'send',
      verified: false,
      api: {
        endpoint: '/posts',
        method: 'POST',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          channelId: 'channel_id',
          message: 'message',
          rootId: 'root_id',
        },
      },
      inputSchema: {
        channelId: {
          type: 'string',
          required: true,
          label: 'Channel ID',
          description: 'The ID of the channel to post to',
          aiControlled: false,
        },
        message: {
          type: 'string',
          required: true,
          label: 'Message',
          inputType: 'textarea',
          description: 'The message text to send',
          aiControlled: true,
          aiDescription: 'Generate an appropriate message for the Mattermost channel post',
        },
        rootId: {
          type: 'string',
          required: false,
          label: 'Parent Post ID',
          description: 'If set, the message will be a threaded reply to the specified post',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string', description: 'Post ID' },
        channel_id: { type: 'string' },
        message: { type: 'string' },
        create_at: { type: 'number' },
      },
    },
    {
      id: 'post_ephemeral_message',
      name: 'Post Ephemeral Message',
      description: 'Post an ephemeral message visible only to a specific user',
      category: 'Message',
      icon: 'eye-off',
      verified: false,
      api: {
        endpoint: '/posts/ephemeral',
        method: 'POST',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          userId: 'user_id',
          channelId: 'channel_id',
          message: 'message',
        },
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'The ID of the user who will see the message',
          aiControlled: false,
        },
        channelId: {
          type: 'string',
          required: true,
          label: 'Channel ID',
          description: 'The ID of the channel to post to',
          aiControlled: false,
        },
        message: {
          type: 'string',
          required: true,
          label: 'Message',
          inputType: 'textarea',
          description: 'The ephemeral message text',
          aiControlled: true,
          aiDescription: 'Generate an appropriate ephemeral message visible only to the specified user',
        },
      },
      outputSchema: {
        post: { type: 'object' },
      },
    },
    {
      id: 'delete_message',
      name: 'Delete Message',
      description: 'Delete a message',
      category: 'Message',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/posts/{postId}',
        method: 'DELETE',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        postId: {
          type: 'string',
          required: true,
          label: 'Post ID',
          description: 'The ID of the post to delete',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },
    // Reaction Actions
    {
      id: 'create_reaction',
      name: 'Create Reaction',
      description: 'Add a reaction to a post',
      category: 'Reaction',
      icon: 'smile',
      verified: false,
      api: {
        endpoint: '/reactions',
        method: 'POST',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          userId: 'user_id',
          postId: 'post_id',
          emojiName: 'emoji_name',
        },
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'The ID of the user sending the reaction',
          aiControlled: false,
        },
        postId: {
          type: 'string',
          required: true,
          label: 'Post ID',
          placeholder: '3moacfqxmbdw38r38fjprh6zsr',
          description: 'The ID of the post to react to',
          aiControlled: false,
        },
        emojiName: {
          type: 'string',
          required: true,
          label: 'Emoji Name',
          placeholder: 'thumbsup',
          description: 'The emoji to use for this reaction',
          aiControlled: false,
        },
      },
      outputSchema: {
        user_id: { type: 'string' },
        post_id: { type: 'string' },
        emoji_name: { type: 'string' },
        create_at: { type: 'number' },
      },
    },
    {
      id: 'delete_reaction',
      name: 'Delete Reaction',
      description: 'Remove a reaction from a post',
      category: 'Reaction',
      icon: 'x-circle',
      verified: false,
      api: {
        endpoint: '/users/{userId}/posts/{postId}/reactions/{emojiName}',
        method: 'DELETE',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'The ID of the user who created the reaction',
          aiControlled: false,
        },
        postId: {
          type: 'string',
          required: true,
          label: 'Post ID',
          description: 'The ID of the post',
          aiControlled: false,
        },
        emojiName: {
          type: 'string',
          required: true,
          label: 'Emoji Name',
          description: 'The emoji name of the reaction to delete',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },
    {
      id: 'get_all_reactions',
      name: 'Get All Reactions',
      description: 'Get all reactions for a post',
      category: 'Reaction',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/posts/{postId}/reactions',
        method: 'GET',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        postId: {
          type: 'string',
          required: true,
          label: 'Post ID',
          description: 'The ID of the post',
          aiControlled: false,
        },
      },
      outputSchema: {
        reactions: { type: 'array', description: 'List of reactions' },
      },
    },
    // User Actions
    {
      id: 'create_user',
      name: 'Create User',
      description: 'Create a new user account',
      category: 'User',
      icon: 'user-plus',
      verified: false,
      api: {
        endpoint: '/users',
        method: 'POST',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          username: 'username',
          email: 'email',
          password: 'password',
          firstName: 'first_name',
          lastName: 'last_name',
          nickname: 'nickname',
          locale: 'locale',
        },
      },
      inputSchema: {
        username: {
          type: 'string',
          required: true,
          label: 'Username',
          description: 'The username for the new user',
          aiControlled: false,
        },
        email: {
          type: 'string',
          required: true,
          label: 'Email',
          inputType: 'email',
          placeholder: 'user@example.com',
          description: 'The email address for the new user',
          aiControlled: false,
        },
        password: {
          type: 'string',
          required: true,
          label: 'Password',
          inputType: 'password',
          description: 'The password for the new user',
          aiControlled: false,
        },
        firstName: {
          type: 'string',
          required: false,
          label: 'First Name',
          description: 'The first name of the user',
          aiControlled: false,
        },
        lastName: {
          type: 'string',
          required: false,
          label: 'Last Name',
          description: 'The last name of the user',
          aiControlled: false,
        },
        nickname: {
          type: 'string',
          required: false,
          label: 'Nickname',
          description: 'The nickname for the user',
          aiControlled: false,
        },
        locale: {
          type: 'string',
          required: false,
          label: 'Locale',
          default: 'en',
          description: 'The locale preference for the user',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string', description: 'User ID' },
        username: { type: 'string' },
        email: { type: 'string' },
      },
    },
    {
      id: 'deactivate_user',
      name: 'Deactivate User',
      description: 'Deactivate a user account',
      category: 'User',
      icon: 'user-minus',
      verified: false,
      api: {
        endpoint: '/users/{userId}',
        method: 'DELETE',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'The ID of the user to deactivate',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },
    {
      id: 'get_user_by_id',
      name: 'Get User by ID',
      description: 'Get a user by their ID',
      category: 'User',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/users/{userId}',
        method: 'GET',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'The ID of the user to retrieve',
          aiControlled: false,
        },
      },
      outputSchema: {
        user: { type: 'object', description: 'User information' },
      },
    },
    {
      id: 'get_user_by_email',
      name: 'Get User by Email',
      description: 'Get a user by their email address',
      category: 'User',
      icon: 'mail',
      verified: false,
      api: {
        endpoint: '/users/email/{email}',
        method: 'GET',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        email: {
          type: 'string',
          required: true,
          label: 'Email',
          inputType: 'email',
          placeholder: 'user@example.com',
          description: 'The email address of the user to retrieve',
          aiControlled: false,
        },
      },
      outputSchema: {
        user: { type: 'object', description: 'User information' },
      },
    },
    {
      id: 'get_all_users',
      name: 'Get All Users',
      description: 'Retrieve multiple users',
      category: 'User',
      icon: 'users',
      verified: false,
      api: {
        endpoint: '/users',
        method: 'GET',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        page: {
          type: 'number',
          required: false,
          label: 'Page',
          default: 0,
          description: 'The page number to retrieve',
          aiControlled: false,
        },
        perPage: {
          type: 'number',
          required: false,
          label: 'Per Page',
          default: 60,
          description: 'Number of users per page',
          aiControlled: false,
        },
      },
      outputSchema: {
        users: { type: 'array', description: 'List of users' },
      },
    },
    {
      id: 'invite_user_to_team',
      name: 'Invite User to Team',
      description: 'Send an email invite to a user to join a team',
      category: 'User',
      icon: 'mail',
      verified: false,
      api: {
        endpoint: '/teams/{teamId}/invite/email',
        method: 'POST',
        baseUrl: '{baseUrl}/api/v4',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          description: 'The ID of the team to invite the user to',
          aiControlled: false,
        },
        email: {
          type: 'string',
          required: true,
          label: 'Email',
          inputType: 'email',
          placeholder: 'user@example.com',
          description: 'The email address to send the invitation to',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },
  ],

  supported_triggers: [],
};
