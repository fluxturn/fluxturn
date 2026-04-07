<!--
This is a draft of the umbrella tracking issue body. Copy the content below
(everything after the second `---`) into a new GitHub issue:

  Title:  Connector documentation tracker
  Labels: documentation, good first issue, help wanted

After creating the issue, delete this file (it's only here so the draft lives
in the same PR as the docs scaffolding).
-->

---

## Connector documentation tracker

We're documenting all 126 FluxTurn connectors. Each connector gets one markdown file in [`docs/connectors/`](../../tree/main/docs/connectors).

This is a great first contribution if you've used FluxTurn or one of the underlying services.

## How to claim and contribute

1. **Claim a connector** by commenting on this issue: `I'll take Stripe` (or whichever you want). I'll edit this issue to assign it to you so others know it's taken.
2. **Read the template** at [`docs/connectors/_template.md`](../blob/main/docs/connectors/_template.md) and the three reference docs to see the expected format and depth:
   - [`telegram.md`](../blob/main/docs/connectors/telegram.md) — simple API key auth
   - [`gmail.md`](../blob/main/docs/connectors/gmail.md) — OAuth2 with polling triggers
   - [`slack.md`](../blob/main/docs/connectors/slack.md) — Bearer token with webhook (Events API) triggers
3. **Read the connector source** to find real action IDs, trigger IDs, and required fields. The path is in each checklist item below.
4. **Create your doc:** `cp docs/connectors/_template.md docs/connectors/<connector-name>.md` and fill it in.
5. **Open a PR against `main`**, one connector per PR. Title format: `docs(connectors): add documentation for <Connector>`.
6. **Update the checklist** in this issue when your PR merges (or I'll do it).

See [CONTRIBUTING.md](../blob/main/CONTRIBUTING.md#documenting-a-connector) for the full guide.

## What each doc should contain

Following the template:

- **Header** — category, auth type, webhook support, source path
- **Overview** — 1-2 sentences about what the service does
- **Setup** — step-by-step credential creation and connection in FluxTurn
- **Available actions** — table of every action with descriptions; expand the most-used ones
- **Available triggers** — table of every trigger with type (webhook/polling) and descriptions
- **Common gotchas** — things that have actually tripped people up (rate limits, scope issues, sandbox vs prod)
- **Example workflow** — one realistic workflow using this connector
- **Links** — official API docs, dev portal, source file

## Checklist

Total: **126 connectors** • **3 documented** • **123 to go**

### AI (6)

- [ ] Anthropic — `backend/src/modules/fluxturn/connectors/ai/anthropic/`
- [ ] AWS Bedrock — `backend/src/modules/fluxturn/connectors/ai/aws-bedrock/`
- [ ] Google AI — `backend/src/modules/fluxturn/connectors/ai/google-ai/`
- [ ] Google Gemini — `backend/src/modules/fluxturn/connectors/ai/google-gemini/`
- [ ] OpenAI — `backend/src/modules/fluxturn/connectors/ai/openai/`
- [ ] OpenAI Chatbot — `backend/src/modules/fluxturn/connectors/ai/openai-chatbot/`

### Analytics (7)

- [ ] Google Analytics — `backend/src/modules/fluxturn/connectors/analytics/google-analytics/`
- [ ] Grafana — `backend/src/modules/fluxturn/connectors/analytics/grafana/`
- [ ] Metabase — `backend/src/modules/fluxturn/connectors/analytics/metabase/`
- [ ] Mixpanel — `backend/src/modules/fluxturn/connectors/analytics/mixpanel/`
- [ ] PostHog — `backend/src/modules/fluxturn/connectors/analytics/posthog/`
- [ ] Segment — `backend/src/modules/fluxturn/connectors/analytics/segment/`
- [ ] Splunk — `backend/src/modules/fluxturn/connectors/analytics/splunk/`

### CMS (5)

- [ ] Contentful — `backend/src/modules/fluxturn/connectors/cms/contentful/`
- [ ] Ghost — `backend/src/modules/fluxturn/connectors/cms/ghost/`
- [ ] Medium — `backend/src/modules/fluxturn/connectors/cms/medium/`
- [ ] Webflow — `backend/src/modules/fluxturn/connectors/cms/webflow/`
- [ ] WordPress — `backend/src/modules/fluxturn/connectors/cms/wordpress/`

### Communication (16)

- [ ] AWS SES — `backend/src/modules/fluxturn/connectors/communication/aws-ses/`
- [ ] Calendly — `backend/src/modules/fluxturn/connectors/communication/calendly/`
- [ ] Discord — `backend/src/modules/fluxturn/connectors/communication/discord/`
- [ ] Discourse — `backend/src/modules/fluxturn/connectors/communication/discourse/`
- [x] Gmail — done in [`docs/connectors/gmail.md`](../blob/main/docs/connectors/gmail.md)
- [ ] Google Calendar — `backend/src/modules/fluxturn/connectors/communication/google-calendar/`
- [ ] IMAP — `backend/src/modules/fluxturn/connectors/communication/imap/`
- [ ] Matrix — `backend/src/modules/fluxturn/connectors/communication/matrix/`
- [ ] Mattermost — `backend/src/modules/fluxturn/connectors/communication/mattermost/`
- [ ] POP3 — `backend/src/modules/fluxturn/connectors/communication/pop3/`
- [x] Slack — done in [`docs/connectors/slack.md`](../blob/main/docs/connectors/slack.md)
- [ ] SMTP — `backend/src/modules/fluxturn/connectors/communication/smtp/`
- [ ] Microsoft Teams — `backend/src/modules/fluxturn/connectors/communication/teams/`
- [x] Telegram — done in [`docs/connectors/telegram.md`](../blob/main/docs/connectors/telegram.md)
- [ ] Twilio — `backend/src/modules/fluxturn/connectors/communication/twilio/`
- [ ] WhatsApp — `backend/src/modules/fluxturn/connectors/communication/whatsapp/`

### CRM (7)

- [ ] Airtable — `backend/src/modules/fluxturn/connectors/crm/airtable/`
- [ ] HubSpot — `backend/src/modules/fluxturn/connectors/crm/hubspot/`
- [ ] Jotform (CRM) — `backend/src/modules/fluxturn/connectors/crm/jotform/`
- [ ] Monday.com — `backend/src/modules/fluxturn/connectors/crm/monday/`
- [ ] Pipedrive — `backend/src/modules/fluxturn/connectors/crm/pipedrive/`
- [ ] Salesforce — `backend/src/modules/fluxturn/connectors/crm/salesforce/`
- [ ] Zoho CRM — `backend/src/modules/fluxturn/connectors/crm/zoho/`

### Data Processing (3)

- [ ] Extract From File — `backend/src/modules/fluxturn/connectors/data_processing/extract-from-file/`
- [ ] Scrapfly — `backend/src/modules/fluxturn/connectors/data_processing/scrapfly/`
- [ ] Supabase — `backend/src/modules/fluxturn/connectors/data_processing/supabase/`

### Database (1)

- [ ] Elasticsearch — `backend/src/modules/fluxturn/connectors/database/elasticsearch/`

### Development (9)

- [ ] Bitbucket — `backend/src/modules/fluxturn/connectors/development/bitbucket/`
- [ ] Git — `backend/src/modules/fluxturn/connectors/development/git/`
- [ ] GitHub — `backend/src/modules/fluxturn/connectors/development/github/`
- [ ] GitLab — `backend/src/modules/fluxturn/connectors/development/gitlab/`
- [ ] Jenkins — `backend/src/modules/fluxturn/connectors/development/jenkins/`
- [ ] n8n — `backend/src/modules/fluxturn/connectors/development/n8n/`
- [ ] Netlify — `backend/src/modules/fluxturn/connectors/development/netlify/`
- [ ] npm — `backend/src/modules/fluxturn/connectors/development/npm/`
- [ ] Travis CI — `backend/src/modules/fluxturn/connectors/development/travis-ci/`

### E-Commerce (8)

- [ ] Gumroad — `backend/src/modules/fluxturn/connectors/ecommerce/gumroad/`
- [ ] Magento — `backend/src/modules/fluxturn/connectors/ecommerce/magento/`
- [ ] Paddle — `backend/src/modules/fluxturn/connectors/ecommerce/paddle/`
- [ ] PayPal — `backend/src/modules/fluxturn/connectors/ecommerce/paypal/`
- [ ] Shopify — `backend/src/modules/fluxturn/connectors/ecommerce/shopify/`
- [ ] Stripe — `backend/src/modules/fluxturn/connectors/ecommerce/stripe/`
- [ ] Stripe v2 — `backend/src/modules/fluxturn/connectors/ecommerce/stripe-v2/`
- [ ] WooCommerce — `backend/src/modules/fluxturn/connectors/ecommerce/woocommerce/`

### Finance (5)

- [ ] Chargebee — `backend/src/modules/fluxturn/connectors/finance/chargebee/`
- [ ] Plaid — `backend/src/modules/fluxturn/connectors/finance/plaid/`
- [ ] QuickBooks — `backend/src/modules/fluxturn/connectors/finance/quickbooks/`
- [ ] Wise — `backend/src/modules/fluxturn/connectors/finance/wise/`
- [ ] Xero — `backend/src/modules/fluxturn/connectors/finance/xero/`

### Forms (3)

- [ ] Google Forms — `backend/src/modules/fluxturn/connectors/forms/google-forms/`
- [ ] Jotform (Forms) — `backend/src/modules/fluxturn/connectors/forms/jotform/`
- [ ] Typeform — `backend/src/modules/fluxturn/connectors/forms/typeform/`

### Infrastructure (4)

- [ ] Cloudflare — `backend/src/modules/fluxturn/connectors/infrastructure/cloudflare/`
- [ ] GraphQL — `backend/src/modules/fluxturn/connectors/infrastructure/graphql/`
- [ ] Kafka — `backend/src/modules/fluxturn/connectors/infrastructure/kafka/`
- [ ] RabbitMQ — `backend/src/modules/fluxturn/connectors/infrastructure/rabbitmq/`

### Marketing (7)

- [ ] ActiveCampaign — `backend/src/modules/fluxturn/connectors/marketing/activecampaign/`
- [ ] Brevo — `backend/src/modules/fluxturn/connectors/marketing/brevo/`
- [ ] Facebook Ads — `backend/src/modules/fluxturn/connectors/marketing/facebook-ads/`
- [ ] Google Ads — `backend/src/modules/fluxturn/connectors/marketing/google-ads/`
- [ ] Klaviyo — `backend/src/modules/fluxturn/connectors/marketing/klaviyo/`
- [ ] Mailchimp — `backend/src/modules/fluxturn/connectors/marketing/mailchimp/`
- [ ] SendGrid — `backend/src/modules/fluxturn/connectors/marketing/sendgrid/`

### Productivity (6)

- [ ] Clockify — `backend/src/modules/fluxturn/connectors/productivity/clockify/`
- [ ] Figma — `backend/src/modules/fluxturn/connectors/productivity/figma/`
- [ ] Harvest — `backend/src/modules/fluxturn/connectors/productivity/harvest/`
- [ ] Spotify — `backend/src/modules/fluxturn/connectors/productivity/spotify/`
- [ ] Todoist — `backend/src/modules/fluxturn/connectors/productivity/todoist/`
- [ ] Toggl — `backend/src/modules/fluxturn/connectors/productivity/toggl/`

### Project Management (6)

- [ ] Asana — `backend/src/modules/fluxturn/connectors/project-management/asana/`
- [ ] ClickUp — `backend/src/modules/fluxturn/connectors/project-management/clickup/`
- [ ] Jira — `backend/src/modules/fluxturn/connectors/project-management/jira/`
- [ ] Linear — `backend/src/modules/fluxturn/connectors/project-management/linear/`
- [ ] Notion — `backend/src/modules/fluxturn/connectors/project-management/notion/`
- [ ] Trello — `backend/src/modules/fluxturn/connectors/project-management/trello/`

### Social (9)

- [ ] Facebook — `backend/src/modules/fluxturn/connectors/social/facebook/`
- [ ] Facebook Graph — `backend/src/modules/fluxturn/connectors/social/facebook-graph/`
- [ ] Instagram — `backend/src/modules/fluxturn/connectors/social/instagram/`
- [ ] LinkedIn — `backend/src/modules/fluxturn/connectors/social/linkedin/`
- [ ] Pinterest — `backend/src/modules/fluxturn/connectors/social/pinterest/`
- [ ] Reddit — `backend/src/modules/fluxturn/connectors/social/reddit/`
- [ ] TikTok — `backend/src/modules/fluxturn/connectors/social/tiktok/`
- [ ] Twitter — `backend/src/modules/fluxturn/connectors/social/twitter/`
- [ ] YouTube (Social) — `backend/src/modules/fluxturn/connectors/social/youtube/`

### Storage (10)

- [ ] AWS S3 — `backend/src/modules/fluxturn/connectors/storage/aws-s3/`
- [ ] Dropbox — `backend/src/modules/fluxturn/connectors/storage/dropbox/`
- [ ] Google Docs — `backend/src/modules/fluxturn/connectors/storage/google-docs/`
- [ ] Google Drive — `backend/src/modules/fluxturn/connectors/storage/google-drive/`
- [ ] Google Sheets — `backend/src/modules/fluxturn/connectors/storage/google-sheets/`
- [ ] MongoDB — `backend/src/modules/fluxturn/connectors/storage/mongodb/`
- [ ] MySQL — `backend/src/modules/fluxturn/connectors/storage/mysql/`
- [ ] PostgreSQL — `backend/src/modules/fluxturn/connectors/storage/postgresql/`
- [ ] Redis — `backend/src/modules/fluxturn/connectors/storage/redis/`
- [ ] Snowflake — `backend/src/modules/fluxturn/connectors/storage/snowflake/`

### Support (6)

- [ ] Freshdesk — `backend/src/modules/fluxturn/connectors/support/freshdesk/`
- [ ] Intercom — `backend/src/modules/fluxturn/connectors/support/intercom/`
- [ ] PagerDuty — `backend/src/modules/fluxturn/connectors/support/pagerduty/`
- [ ] Sentry — `backend/src/modules/fluxturn/connectors/support/sentry-io/`
- [ ] ServiceNow — `backend/src/modules/fluxturn/connectors/support/servicenow/`
- [ ] Zendesk — `backend/src/modules/fluxturn/connectors/support/zendesk/`

### Utility (5)

- [ ] Bitly — `backend/src/modules/fluxturn/connectors/utility/bitly/`
- [ ] DeepL — `backend/src/modules/fluxturn/connectors/utility/deepl/`
- [ ] Execute Command — `backend/src/modules/fluxturn/connectors/utility/execute-command/`
- [ ] FTP — `backend/src/modules/fluxturn/connectors/utility/ftp/`
- [ ] SSH — `backend/src/modules/fluxturn/connectors/utility/ssh/`

### Video (2)

- [ ] YouTube (Video) — `backend/src/modules/fluxturn/connectors/video/youtube/`
- [ ] Zoom — `backend/src/modules/fluxturn/connectors/video/zoom/`

---

**Notes:**
- Jotform appears in both `crm/` and `forms/` — they're separate implementations of the same service. Both need docs.
- YouTube appears in both `social/` and `video/` — same situation.

Thanks for helping document FluxTurn! Every doc makes the platform easier to use.
