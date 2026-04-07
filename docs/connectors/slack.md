# Slack

**Category:** communication
**Auth type:** Bearer Token (Slack OAuth)
**Webhook support:** Yes (Events API)
**Source:** [`backend/src/modules/fluxturn/connectors/communication/slack/slack.connector.ts`](../../backend/src/modules/fluxturn/connectors/communication/slack/slack.connector.ts)

---

## Overview

Send and manage Slack messages, channels, files, and reactions. Reacts to incoming Slack events (messages, mentions, reactions, file uploads) via the [Slack Events API](https://api.slack.com/apis/connections/events-api). Authenticated as a [Slack app](https://api.slack.com/apps) with bot token scopes.

## Setup

1. **Create a Slack app**
   - Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
   - Name your app and pick a workspace to install it in
   - Under **OAuth & Permissions**, add the following **Bot Token Scopes**:
     - `chat:write`, `chat:write.customize` — send messages
     - `channels:read`, `channels:manage`, `channels:history` — public channels
     - `groups:read`, `groups:history` — private channels
     - `im:read`, `im:write`, `im:history` — DMs
     - `mpim:read`, `mpim:history` — group DMs
     - `users:read` — user lookups
     - `app_mentions:read` — `@mention` triggers
     - `reactions:read` — reaction triggers
     - `files:read` — file triggers
   - These are the scopes the connector requests; you can omit any you don't need, but the matching actions/triggers will fail.

2. **Install the app to your workspace**
   - Still in **OAuth & Permissions**, click **Install to Workspace**
   - Slack will show the requested scopes and ask for approval
   - After install, copy the **Bot User OAuth Token** (starts with `xoxb-`)

3. **Add the credential in FluxTurn**
   - Go to **Credentials** → **Add Credential** → **Slack**
   - Paste the `xoxb-` token in the **Bearer Token** field
   - Click **Test Connection** — FluxTurn calls Slack's `auth.test` endpoint to verify
   - Save

4. **For triggers, configure the Events API**
   - Back in your Slack app settings, go to **Event Subscriptions** → enable
   - Request URL: `https://your-instance.com/api/v1/connectors/webhook/slack/<trigger-id>` (FluxTurn shows you the exact URL when you create a workflow with a Slack trigger)
   - Subscribe to the bot events that match the triggers you want (`message.channels`, `app_mention`, `reaction_added`, etc.)
   - Reinstall the app if Slack prompts you

## Available actions

| Action ID | Name | Description |
|---|---|---|
| `send_message` | Send Message | Post a message to a channel, DM, or thread |
| `update_message` | Update Message | Edit a previously-sent message |
| `delete_message` | Delete Message | Delete a message by timestamp |
| `get_permalink` | Get Permalink | Get a permanent link to a message |
| `search_messages` | Search Messages | Search workspace messages |
| `create_channel` | Create Channel | Create a new public or private channel |
| `get_channel` | Get Channel | Get a channel's metadata by ID |
| `get_channels` | Get Channels | List channels in the workspace |
| `channel_history` | Channel History | Fetch messages from a channel |
| `invite_to_channel` | Invite to Channel | Invite a user to a channel |
| `join_channel` | Join Channel | Have the bot join a channel |
| `leave_channel` | Leave Channel | Have the bot leave a channel |
| `get_channel_members` | Get Channel Members | List members of a channel |
| `upload_file` | Upload File | Upload a file to Slack |
| `get_file` | Get File | Get a file's metadata by ID |
| `get_users` | Get Users | List workspace users |
| `get_messages` | Get Messages | Get messages by timestamp range |

### `send_message` — Send Message

The most-used action. Posts a message as the bot to a channel, group, DM, or thread.

**Inputs (most common):**

| Field | Type | Required | Description |
|---|---|---|---|
| `channel` | string | yes | Channel ID (`C123456`) or name (`#general`) |
| `text` | string | yes* | Plain-text message body |
| `blocks` | array | no | [Block Kit](https://api.slack.com/block-kit) JSON for rich formatting |
| `thread_ts` | string | no | Timestamp of the parent message to reply in a thread |
| `unfurl_links` | boolean | no | Whether to unfurl URLs in the message |

*Either `text` or `blocks` is required.

## Available triggers

| Trigger ID | Name | Type | Description |
|---|---|---|---|
| `message` | Message | Webhook | Fires on any message in a channel the bot can see |
| `app_mention` | App Mention | Webhook | Fires when someone `@mentions` the bot |
| `reaction_added` | Reaction Added | Webhook | Fires when someone adds an emoji reaction |
| `channel_created` | Channel Created | Webhook | Fires when a new channel is created |
| `team_join` | Team Join | Webhook | Fires when a new user joins the workspace |
| `file_shared` | File Shared | Webhook | Fires when a file is shared |
| `file_public` | File Made Public | Webhook | Fires when a file is made publicly accessible |

All Slack triggers are **webhook-based** via the Events API. Slack pushes events to your FluxTurn instance — you must have the Events API URL configured in your Slack app settings (see Setup step 4).

### `app_mention` — App Mention

The "Slack-native" way to build a bot. Fires only when someone explicitly `@mentions` the bot in a channel it's a member of, so it's much quieter than the broad `message` trigger.

**Output payload:**

| Field | Type | Description |
|---|---|---|
| `text` | string | The message text (including the `@bot` mention) |
| `user` | string | User ID of who mentioned the bot |
| `channel` | string | Channel ID where the mention happened |
| `ts` | string | Timestamp of the mention (use as `thread_ts` to reply in thread) |

## Common gotchas

- **Bot must be in the channel.** A bot can only post to channels it's been invited to. Use `join_channel` or invite the bot manually with `/invite @YourBotName` in Slack.
- **`channel` field accepts ID or name.** Channel IDs (`C0123456789`) are more reliable than names (`#general`) because names can change. Use `get_channels` to look up IDs.
- **Threading.** To reply in a thread, set `thread_ts` to the parent message's `ts`. Without it, your reply posts as a new top-level message in the channel.
- **Block Kit vs text.** If you use `blocks`, the `text` field is used as a fallback for notifications and screen readers. Provide both for accessibility.
- **Rate limits.** Slack's API has tier-based rate limits — `chat.postMessage` is Tier 4 (~50/minute). The connector enforces `requestsPerMinute: 50` to stay safe. Bursting will hit `ratelimited` errors.
- **Events API URL must be HTTPS.** Slack only delivers events to verified HTTPS endpoints with valid certificates. For local development, use ngrok or cloudflared and configure the public URL in your Slack app settings.
- **Slack verifies the URL on save.** When you set the Events API URL in your app config, Slack sends a one-time `url_verification` challenge that FluxTurn responds to automatically — but only if the workflow is **active** at the moment Slack verifies. Activate the workflow first, then save the URL in Slack.
- **Scopes are sticky.** If you change scopes after installing the app, you must reinstall it (Slack will prompt). The token won't auto-update.
- **DMs need different scopes.** To send messages to a DM, you need `im:write` and you must use the user ID (`U0123456789`) as the channel, not the user's name.

## Example workflow

**Goal:** When someone `@mentions` the bot in any channel, classify the message with OpenAI and reply in-thread with the answer.

**Nodes:**

1. **Slack - App Mention** (Slack trigger)
   - Subscribe to the `app_mention` event in your Slack app settings

2. **OpenAI - Create Chat Completion** (OpenAI action)
   - Model: `gpt-4o-mini`
   - Messages:
     ```json
     [
       {"role": "system", "content": "You are a helpful assistant. Reply in 1-2 sentences."},
       {"role": "user", "content": "{{$json.text}}"}
     ]
     ```

3. **Slack - Send Message** (Slack action)
   - Channel: `{{$json.channel}}`
   - Text: `{{$node["OpenAI - Create Chat Completion"].json.choices[0].message.content}}`
   - Thread TS: `{{$json.ts}}` ← this makes it reply in the same thread

When activated, every `@bot` mention in any channel the bot is in gets a threaded GPT-4o-mini reply.

## Links

- [Slack API documentation](https://api.slack.com/)
- [Block Kit Builder](https://app.slack.com/block-kit-builder) (visual editor for rich messages)
- [Slack OAuth scopes reference](https://api.slack.com/scopes)
- [FluxTurn connector source](../../backend/src/modules/fluxturn/connectors/communication/slack/slack.connector.ts)
