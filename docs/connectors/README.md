# Connector documentation

This directory contains per-connector setup guides and reference docs for all 126 connectors that ship with FluxTurn. Each connector gets one markdown file covering:

- Auth setup (where to get credentials)
- Available actions and their inputs
- Available triggers (webhook or polling)
- Common gotchas
- An example workflow

If a connector has a checkmark below, click through to its doc. If it doesn't, that doc hasn't been written yet — see [Contributing](#contributing) below if you'd like to help.

## Contributing

Documenting a connector is a great first contribution to FluxTurn:

1. **Pick a connector** from the list below that doesn't have a checkmark, or claim one in the [connector docs tracking issue](https://github.com/fluxturn/fluxturn/issues) (look for the issue tagged `documentation`).
2. **Copy the template:** `cp docs/connectors/_template.md docs/connectors/<connector-name>.md`
3. **Read the connector source** at `backend/src/modules/fluxturn/connectors/<category>/<name>/<name>.connector.ts` to find real action IDs, trigger IDs, and required fields.
4. **Fill in the template** following the [Telegram](telegram.md), [Gmail](gmail.md), or [Slack](slack.md) examples for tone and depth.
5. **Open a PR** against `main`. Each PR should add exactly one connector doc to keep review easy.

See [CONTRIBUTING.md](../../CONTRIBUTING.md#documenting-a-connector) for the full guide.

---

## All connectors

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
- [x] **[Gmail](gmail.md)** — `backend/src/modules/fluxturn/connectors/communication/gmail/`
- [ ] Google Calendar — `backend/src/modules/fluxturn/connectors/communication/google-calendar/`
- [ ] IMAP — `backend/src/modules/fluxturn/connectors/communication/imap/`
- [ ] Matrix — `backend/src/modules/fluxturn/connectors/communication/matrix/`
- [ ] Mattermost — `backend/src/modules/fluxturn/connectors/communication/mattermost/`
- [ ] POP3 — `backend/src/modules/fluxturn/connectors/communication/pop3/`
- [x] **[Slack](slack.md)** — `backend/src/modules/fluxturn/connectors/communication/slack/`
- [ ] SMTP — `backend/src/modules/fluxturn/connectors/communication/smtp/`
- [ ] Microsoft Teams — `backend/src/modules/fluxturn/connectors/communication/teams/`
- [x] **[Telegram](telegram.md)** — `backend/src/modules/fluxturn/connectors/communication/telegram/`
- [ ] Twilio — `backend/src/modules/fluxturn/connectors/communication/twilio/`
- [ ] WhatsApp — `backend/src/modules/fluxturn/connectors/communication/whatsapp/`

### CRM (7)

- [ ] Airtable — `backend/src/modules/fluxturn/connectors/crm/airtable/`
- [ ] HubSpot — `backend/src/modules/fluxturn/connectors/crm/hubspot/`
- [ ] Jotform — `backend/src/modules/fluxturn/connectors/crm/jotform/`
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

**Total: 126 connectors • 3 documented • 123 to go**

> Notes:
> - **Jotform** appears in both `crm/` and `forms/` — they're different implementations of the same service.
> - **YouTube** appears in both `social/` and `video/` — same situation.
> - There's also a `connectors/implementations/redis.connector.ts` file alongside `connectors/storage/redis/`. The `storage/redis` one is the user-facing connector; `implementations/redis.connector.ts` is internal infrastructure and doesn't need a doc.
