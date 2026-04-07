# {Connector Name}

> Replace `{Connector Name}` and the rest of the placeholders below.
> When you're done, delete this blockquote and the `> ` notes that follow each section.
> See `telegram.md`, `gmail.md`, or `slack.md` for completed examples.

**Category:** {ai | analytics | cms | communication | crm | data_processing | database | development | ecommerce | finance | forms | infrastructure | marketing | productivity | project-management | social | storage | support | utility | video}
**Auth type:** {API Key | OAuth2 | Bearer Token | Basic Auth}
**Webhook support:** {Yes | No}
**Source:** [`backend/src/modules/fluxturn/connectors/{category}/{name}/{name}.connector.ts`](../../backend/src/modules/fluxturn/connectors/{category}/{name}/{name}.connector.ts)

---

## Overview

> One or two sentences explaining what this service is and what FluxTurn workflows can do with it. Keep it short — the action/trigger lists below carry the detail.

## Setup

> Step-by-step instructions for getting credentials from the third-party service and connecting them in FluxTurn.

1. **Get your credentials from {Service}**
   - Sign in to the {Service} dashboard
   - Navigate to {API/Developer/Settings} → {Credentials/API Keys/Apps}
   - {Specific instructions: create an app, copy a token, etc.}

2. **Add the credential in FluxTurn**
   - Open FluxTurn at `http://localhost:5185` (or your deployment URL)
   - Go to **Credentials** → **Add Credential**
   - Select **{Connector Name}** from the list
   - Paste your {token / API key / OAuth flow} and click **Test Connection**
   - Give the credential a name and save

3. **Use it in a workflow**
   - In the workflow editor, add a node and search for **{Connector Name}**
   - Pick the action or trigger you want
   - Select your saved credential from the dropdown

## Available actions

> List every action exposed by the connector. The action `id` values come from `getActions()` in the connector source file.

| Action ID | Name | Description |
|---|---|---|
| `action_id_1` | Action Name | What it does in one line |
| `action_id_2` | Action Name | What it does in one line |

### `action_id_1` — Action Name

> Optional: expand on actions that need more explanation. Document required vs optional fields.

**Inputs:**

| Field | Type | Required | Description |
|---|---|---|---|
| `field1` | string | yes | What this field is |
| `field2` | number | no | What this field is |

**Output:** Brief description of what the action returns.

## Available triggers

> List every trigger from `getTriggers()`. Note whether each is webhook-based, polling-based, or both.

| Trigger ID | Name | Type | Description |
|---|---|---|---|
| `trigger_id_1` | Trigger Name | Webhook | When the workflow fires |
| `trigger_id_2` | Trigger Name | Polling | When the workflow fires |

### `trigger_id_1` — Trigger Name

> Expand on triggers if needed. For webhook triggers, mention whether FluxTurn auto-registers the webhook or whether the user has to set it up manually in the third-party service.

**Output payload:**

| Field | Type | Description |
|---|---|---|
| `field1` | string | What it contains |

## Common gotchas

> Things that have tripped people up. Examples:
> - Sandbox vs production credentials use different URLs
> - Rate limits and how to avoid them
> - Permissions/scopes that aren't obvious
> - Common error messages and what they mean

- **{Gotcha 1}:** Explanation and workaround.
- **{Gotcha 2}:** Explanation and workaround.

## Example workflow

> One realistic workflow using this connector. Describe the trigger, the actions, and what data flows between them. Use the same expression syntax as the rest of the docs (`{{$json.field}}`).

**Goal:** {What this workflow accomplishes in plain English}

**Nodes:**

1. **{Trigger Name}** ({Connector Name} trigger)
   - {Configuration details}
2. **{Action 1}** ({Connector Name} action)
   - Input: `{{$json.field}}`
3. **{Action 2}** (some other connector or built-in node)
   - Input: `{{$node["Step 1"].json.field}}`

## Links

- [Official {Service} API documentation]({url})
- [FluxTurn connector source](../../backend/src/modules/fluxturn/connectors/{category}/{name}/{name}.connector.ts)
