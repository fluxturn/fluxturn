# Slack OAuth Setup Guide

This guide will help you set up one-click OAuth authentication for Slack in Fluxturn.

## Prerequisites

- A Slack workspace where you have admin permissions
- Access to your Fluxturn backend environment variables

## Step 1: Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Enter App Name: `Fluxturn` (or your preferred name)
5. Select your Slack workspace
6. Click **"Create App"**

## Step 2: Configure OAuth & Permissions

1. In your Slack App settings, navigate to **"OAuth & Permissions"** in the left sidebar

2. Scroll down to **"Redirect URLs"** and click **"Add New Redirect URL"**

3. Add your redirect URI:
   - **Development**: `http://localhost:3004/api/v1/oauth/slack/callback`
   - **Production**: `https://yourdomain.com/api/v1/oauth/slack/callback`

4. Click **"Add"** then **"Save URLs"**

## Step 3: Add Bot Token Scopes

Still in **"OAuth & Permissions"**, scroll down to **"Scopes"** → **"Bot Token Scopes"**

Add the following scopes:

### Essential Scopes (Required):
- `chat:write` - Post messages
- `chat:write.customize` - Customize bot name and icon
- `channels:read` - View basic info about public channels
- `users:read` - View users and their basic info

### Additional Scopes (for Full Functionality):
- `channels:manage` - Manage public channels
- `channels:history` - View messages in public channels
- `groups:read` - View basic info about private channels
- `groups:history` - View messages in private channels
- `im:read` - View basic info about direct messages
- `im:write` - Start and manage direct messages
- `im:history` - View messages in direct messages
- `mpim:read` - View basic info about group direct messages
- `mpim:history` - View messages in group direct messages
- `files:read` - View files shared in channels
- `files:write` - Upload, edit, and delete files
- `reactions:read` - View emoji reactions
- `reactions:write` - Add and remove emoji reactions

## Step 4: Get Your Client Credentials

1. Navigate to **"Basic Information"** in the left sidebar
2. Scroll down to **"App Credentials"**
3. You'll see:
   - **Client ID**: `1234567890.1234567890`
   - **Client Secret**: Click **"Show"** to reveal it
   - **Signing Secret**: (You won't need this for OAuth)

## Step 5: Configure Environment Variables

Add these to your `.env` file in the backend directory:

```bash
# Slack OAuth Configuration
SLACK_OAUTH_CLIENT_ID=1234567890.1234567890
SLACK_OAUTH_CLIENT_SECRET=your_client_secret_here
SLACK_OAUTH_REDIRECT_URI=http://localhost:3004/api/v1/oauth/slack/callback
```

**Important**:
- Replace the values with your actual Client ID and Client Secret
- For production, update the `SLACK_OAUTH_REDIRECT_URI` to your production URL
- Keep your Client Secret secure and never commit it to version control

## Step 6: Restart Your Backend

After updating the `.env` file, restart your backend server:

```bash
npm start
```

## Step 7: Test the OAuth Flow

1. Go to your Fluxturn frontend
2. Create a new workflow
3. Add a Slack action node
4. Click on the credential dropdown
5. Click **"+"** to add a new credential
6. Select **"Slack"**
7. Choose **"OAuth2 (Recommended)"** as the authentication method
8. Click **"Connect with Slack"**
9. You'll be redirected to Slack to authorize
10. After authorization, you'll be redirected back with your credential ready to use!

## Troubleshooting

### Error: "invalid_redirect_uri"
- Make sure the redirect URI in Slack app settings **exactly** matches your `SLACK_OAUTH_REDIRECT_URI`
- Check for trailing slashes - they must match
- Verify the protocol (`http://` vs `https://`)

### Error: "Slack OAuth is not configured"
- Verify all three environment variables are set
- Restart your backend server
- Check the server logs for any configuration warnings

### Error: "missing_scope"
- Make sure you've added all the required Bot Token Scopes in the Slack App settings
- The scopes must be added **before** initiating the OAuth flow
- If you add scopes after connecting, users need to re-authorize

### OAuth succeeds but actions fail
- Check that your app is installed in the workspace
- Navigate to **"Install App"** in the Slack App settings
- Click **"Install to Workspace"** if not already installed
- Verify the bot has access to the channels you're trying to use

## Security Best Practices

1. **Never share your Client Secret**: Keep it confidential
2. **Use HTTPS in production**: Always use secure connections
3. **Rotate secrets periodically**: Slack allows you to regenerate secrets
4. **Limit scope access**: Only request the scopes you actually need
5. **Monitor usage**: Check Slack's usage dashboard regularly

## Additional Resources

- [Slack OAuth Documentation](https://api.slack.com/authentication/oauth-v2)
- [Slack API Scopes](https://api.slack.com/scopes)
- [Slack App Management](https://api.slack.com/apps)
- [Slack API Methods](https://api.slack.com/methods)

## Support

If you encounter issues:
1. Check the Fluxturn backend logs
2. Review Slack's App Event Subscriptions for webhook errors
3. Test your credentials with Slack's API tester: https://api.slack.com/methods/auth.test/test
