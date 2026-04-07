# Gmail

**Category:** communication
**Auth type:** OAuth2 (Google)
**Webhook support:** Yes (push notifications via polling fallback)
**Source:** [`backend/src/modules/fluxturn/connectors/communication/gmail/gmail.connector.ts`](../../backend/src/modules/fluxturn/connectors/communication/gmail/gmail.connector.ts)

---

## Overview

Send, read, search, label, and manage emails through a Gmail account using the [Gmail API](https://developers.google.com/gmail/api). Supports both interactive workflows ("send a follow-up when X happens") and automated email processing ("when an email matching this filter arrives, do Y").

## Setup

1. **Create a Google Cloud OAuth client**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a project (or pick an existing one)
   - Enable the **Gmail API**: APIs & Services → Library → search "Gmail API" → Enable
   - Go to **APIs & Services → Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:5005/api/v1/oauth/google/callback` (for local dev — use your production URL otherwise)
   - Copy the **Client ID** and **Client Secret**

2. **Configure FluxTurn's Google OAuth credentials**
   - Add the values to your `backend/.env` file:
     ```
     GOOGLE_OAUTH_CLIENT_ID=your-client-id
     GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
     GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5005/api/v1/oauth/google/callback
     ```
   - Restart the backend so the new env vars are picked up

3. **Connect your Gmail account**
   - In FluxTurn, go to **Credentials** → **Add Credential** → **Gmail**
   - Click **Connect with Google** — a popup opens with the Google consent screen
   - Sign in and grant the requested scopes (compose, read, modify, labels)
   - The popup closes, the credential is saved with refresh tokens, and you're done

## Available actions

| Action ID | Name | Description |
|---|---|---|
| `send_email` | Send Email | Send a new email (plain text or HTML, with optional CC/BCC and attachments) |
| `get_emails` | Get Emails | Retrieve emails from the inbox with optional filters |
| `create_draft` | Create Draft | Create an email draft without sending |
| `add_label` | Add Label | Add one or more labels to a specific email |
| `search_emails` | Search Emails | Search using [Gmail search syntax](https://support.google.com/mail/answer/7190) |
| `delete_email` | Delete Email | Permanently delete an email |
| `mark_as_read` | Mark as Read | Mark a specific email as read |

### `send_email` — Send Email

**Inputs:**

| Field | Type | Required | Description |
|---|---|---|---|
| `to` | array of strings | yes | Recipient email addresses |
| `subject` | string | yes | Email subject line |
| `body` | string | yes | Email body content |
| `isHtml` | boolean | no | Set true to send `body` as HTML; default is plain text |
| `cc` | array of strings | no | CC recipients |
| `bcc` | array of strings | no | BCC recipients |
| `attachments` | array | no | Attachment objects (filename + content) |

**Output:** `{ messageId, threadId }` of the sent message.

### `search_emails` — Search Emails

**Inputs:** A `searchOptions` object with a Gmail query string. Examples:

| Query | What it matches |
|---|---|
| `from:alice@example.com is:unread` | Unread mail from Alice |
| `subject:invoice has:attachment newer_than:7d` | Recent invoices with attachments |
| `label:important to:me` | Important mail to you |

**Output:** `{ messages: [...] }` — array of matching email metadata.

## Available triggers

| Trigger ID | Name | Type | Description |
|---|---|---|---|
| `email_received` | Email Received | Polling | Fires when a new email arrives matching the filters |
| `email_sent` | Email Sent | Polling | Fires when you send an email from your account |

### `email_received` — Email Received

This is a **polling trigger**. Gmail's push notifications API requires Pub/Sub setup which is heavyweight, so FluxTurn polls the Gmail API on a configurable interval.

**Inputs:**

| Field | Type | Description |
|---|---|---|
| `readStatus` | enum | `all`, `unread`, or `read` (default: `all`) |
| `sender` | string | Filter by sender email address |
| `labelIds` | array | Only fire for emails with these Gmail labels (`INBOX`, `IMPORTANT`, etc.) |
| `searchQuery` | string | Custom Gmail search query (uses Gmail search syntax) |
| `includeSpamTrash` | boolean | Include emails from Spam and Trash (default: false) |
| `pollingInterval` | enum | How often to check: `1`, `5`, `15`, `30`, or `60` minutes (default: 5) |
| `simple` | boolean | If true, returns metadata only (faster); if false, includes full payload (default: true) |

**Output payload:**

| Field | Type | Description |
|---|---|---|
| `messageId` | string | Gmail message ID |
| `threadId` | string | Gmail thread ID |
| `from` | string | Sender email address |
| `to` | string | Recipient address(es) |
| `subject` | string | Email subject |
| `snippet` | string | Short preview text |
| `date` | string | Email date |
| `labelIds` | array | Gmail labels applied |
| `headers` | object | Full email headers |
| `payload` | object | Full email payload (only if `simple: false`) |

## Common gotchas

- **OAuth scopes are sticky.** If you initially connect with limited scopes and later add an action that needs more, you'll get a `403 insufficient permission` error. Re-authorize the credential to grant the new scopes.
- **Polling delay.** The `email_received` trigger has a minimum 1-minute interval, and the actual delay between an email arriving and the trigger firing is up to `pollingInterval + 60s`. For real-time delivery you'd need Gmail push notifications via Google Pub/Sub, which isn't currently supported.
- **Sending limits.** Gmail's free account allows ~500 sends/day; Workspace accounts allow ~2000/day. Hitting the limit returns `429 Too Many Requests` and the account is temporarily blocked from sending.
- **`From` address.** Emails are sent from the authenticated account's primary address. To send from an alias, configure it in Gmail Settings → Send mail as.
- **Attachment size.** Gmail's API limits messages to 25 MB total (including attachments). Larger files need to be uploaded to Drive and shared via link.
- **HTML body needs `isHtml: true`.** If your `body` contains HTML tags but `isHtml` is false, recipients will see the raw HTML as text.
- **Search query escaping.** Gmail search syntax uses spaces as AND. To search for a phrase, wrap it in quotes: `subject:"weekly report"`.
- **`labelIds`, not label names.** When filtering by label, use the system label IDs (`INBOX`, `IMPORTANT`, `STARRED`, etc.) or the IDs of custom labels (which look like `Label_1234567890`). Get them via `get_labels` if needed.

## Example workflow

**Goal:** When an invoice email arrives, save the PDF attachment to Google Drive and notify a Slack channel.

**Nodes:**

1. **Gmail - Email Received** (Gmail trigger)
   - Search query: `subject:invoice has:attachment newer_than:1d`
   - Polling interval: `5` minutes
   - Simple: `false` (we need the full payload to access attachments)

2. **Google Drive - Upload File** (Google Drive action)
   - File name: `{{$json.subject}}.pdf`
   - Content: from `{{$json.payload.parts[0].body.data}}` (base64 attachment)
   - Folder: `Invoices/2026`

3. **Slack - Send Message** (Slack action)
   - Channel: `#finance`
   - Text: `New invoice from {{$json.from}}: {{$json.subject}}\nSaved to Drive: {{$node["Google Drive - Upload File"].json.webViewLink}}`

When activated, the workflow polls Gmail every 5 minutes for invoice emails, uploads the attachment to Drive, and posts a Slack notification with a link.

## Links

- [Gmail API documentation](https://developers.google.com/gmail/api)
- [Gmail search operators](https://support.google.com/mail/answer/7190)
- [Google Cloud Console](https://console.cloud.google.com/)
- [FluxTurn connector source](../../backend/src/modules/fluxturn/connectors/communication/gmail/gmail.connector.ts)
