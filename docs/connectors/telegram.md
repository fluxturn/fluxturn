# Telegram

**Category:** communication
**Auth type:** API Key (Bot Token)
**Webhook support:** Yes
**Source:** [`backend/src/modules/fluxturn/connectors/communication/telegram/telegram.connector.ts`](../../backend/src/modules/fluxturn/connectors/communication/telegram/telegram.connector.ts)

---

## Overview

Send messages and photos through Telegram bots, and receive incoming messages as workflow triggers. Uses the [Telegram Bot API](https://core.telegram.org/bots/api), so you'll need a bot — not a regular Telegram account.

## Setup

1. **Create a Telegram bot**
   - Open Telegram and start a chat with [@BotFather](https://t.me/botfather)
   - Send `/newbot` and follow the prompts (you'll choose a display name and a username ending in `bot`)
   - BotFather will reply with a **bot token** that looks like `123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
   - Copy that token — it's the only credential you need

2. **Add the credential in FluxTurn**
   - Open FluxTurn at `http://localhost:5185` (or your deployment URL)
   - Go to **Credentials** → **Add Credential**
   - Select **Telegram** from the list
   - Paste your bot token in the **Bot Token** field and click **Test Connection**
   - FluxTurn calls Telegram's `getMe` endpoint to verify the token
   - Save the credential

3. **Find a chat ID to send messages to**
   - Telegram requires the recipient (user, group, or channel) to message your bot first, OR
   - Add the bot to a group/channel as an admin
   - Forward any message from the chat to [@RawDataBot](https://t.me/RawDataBot) to get the numeric chat ID
   - For channels, the chat ID looks like `-1001234567890`

## Available actions

| Action ID | Name | Description |
|---|---|---|
| `send_message` | Send Message | Send a text message to a chat |
| `send_photo` | Send Photo | Send a photo (by URL) to a chat with optional caption |

### `send_message` — Send Message

**Inputs:**

| Field | Type | Required | Description |
|---|---|---|---|
| `chatId` | string | yes | Numeric chat ID, or `@channelusername` for public channels |
| `text` | string | yes | Message body (up to 4096 characters) |
| `parseMode` | enum | no | `Markdown` or `HTML` for formatted text. Leave empty for plain text. |
| `disableNotification` | boolean | no | If true, sends silently (no notification sound) |

**Output:** A Telegram `Message` object including `message_id`, `date`, `chat`, and the sent text.

### `send_photo` — Send Photo

**Inputs:**

| Field | Type | Required | Description |
|---|---|---|---|
| `chatId` | string | yes | Numeric chat ID or channel username |
| `photo` | string | yes | Public URL of the photo (or a file_id from a previously-sent photo) |
| `caption` | string | no | Optional caption (up to 1024 characters) |
| `parseMode` | enum | no | `Markdown` or `HTML` for caption formatting |

**Output:** Same `Message` object as `send_message`, with the photo metadata included.

## Available triggers

| Trigger ID | Name | Type | Description |
|---|---|---|---|
| `new_message` | New Message | Webhook | Fires when the bot receives any message |

### `new_message` — New Message

This is a **webhook trigger** — Telegram pushes events to your FluxTurn instance, so the bot must be reachable from the public internet (use a tunnel like ngrok in dev). FluxTurn registers the webhook automatically when the workflow is activated.

**Output payload:**

| Field | Type | Description |
|---|---|---|
| `message_id` | number | Telegram's unique message ID |
| `text` | string | The message body |
| `from` | object | Sender info (`id`, `username`, `first_name`, etc.) |
| `chat` | object | Chat info (`id`, `type`, `title`) |

## Common gotchas

- **Bots can't initiate conversations.** Your bot can only message a user/group/channel that has *already* interacted with it (sent a message, added it to a group, etc.). New users have to send `/start` to your bot first before you can message them.
- **Group privacy mode.** By default, bots in groups only see messages that mention them or use commands. To receive every message in a group, disable privacy mode in BotFather: `/setprivacy` → select your bot → Disable.
- **Channels need admin access.** To post in a channel, your bot must be added as an administrator with the "Post Messages" permission.
- **Webhook needs HTTPS in production.** Telegram only delivers webhooks to HTTPS URLs with valid certificates. For local development, use a tunnel (ngrok, cloudflared) and FluxTurn will register the public URL.
- **Rate limits.** Telegram allows ~30 messages/second to different chats and ~1 message/second to the same chat. Burst sends to many users can hit limits — use the **Wait** node between messages if you're broadcasting.
- **`parseMode` errors.** If you set `parseMode: 'Markdown'` and the message contains unescaped special characters (`_`, `*`, `[`, `` ` ``), the API rejects the message. Either escape them or use plain text.

## Example workflow

**Goal:** Send a Telegram alert to a private channel whenever a new GitHub issue is opened on a watched repository.

**Nodes:**

1. **GitHub - New Issue** (GitHub trigger)
   - Repository: `your-org/your-repo`
2. **Telegram - Send Message** (Telegram action)
   - Chat ID: `-1001234567890` (your private channel)
   - Parse Mode: `Markdown`
   - Text:
     ```
     *New issue:* {{$json.issue.title}}
     *By:* {{$json.issue.user.login}}
     {{$json.issue.html_url}}
     ```

When activated, every issue opened on the watched repo posts a formatted alert to the Telegram channel.

## Links

- [Telegram Bot API documentation](https://core.telegram.org/bots/api)
- [BotFather guide](https://core.telegram.org/bots#botfather)
- [FluxTurn connector source](../../backend/src/modules/fluxturn/connectors/communication/telegram/telegram.connector.ts)
