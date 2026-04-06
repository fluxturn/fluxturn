<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/fluxturn_1.png" alt="FluxTurn" width="600">
  </a>
</p>

<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>ওপেন-সোর্স AI-চালিত ওয়ার্কফ্লো অটোমেশন প্ল্যাটফর্ম</strong>
  </p>
  <p align="center">
    প্রাকৃতিক ভাষা এবং ভিজ্যুয়াল বিল্ডার দিয়ে ওয়ার্কফ্লো তৈরি, স্বয়ংক্রিয় এবং সংগঠিত করুন।
  </p>
</p>

<p align="center">
  <a href="https://github.com/fluxturn/fluxturn/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License"></a>
  <a href="https://github.com/fluxturn/fluxturn/stargazers"><img src="https://img.shields.io/github/stars/fluxturn/fluxturn?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/fluxturn/fluxturn/issues"><img src="https://img.shields.io/github/issues/fluxturn/fluxturn" alt="Issues"></a>
  <a href="https://github.com/fluxturn/fluxturn/pulls"><img src="https://img.shields.io/github/issues-pr/fluxturn/fluxturn" alt="Pull Requests"></a>
  <a href="https://discord.gg/fluxturn"><img src="https://img.shields.io/discord/YOUR_DISCORD_ID?label=Discord&logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center">
  <a href="https://github.com/fluxturn/fluxturn/wiki">ডকুমেন্টেশন</a> |
  <a href="#quick-start">দ্রুত শুরু</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="CONTRIBUTING.md">অবদান</a>
</p>

<p align="center">
  <a href="./README.md">English</a> |
  <a href="./README_JA.md">日本語</a> |
  <a href="./README_ZH.md">中文</a> |
  <a href="./README_KO.md">한국어</a> |
  <a href="./README_ES.md">Español</a> |
  <a href="./README_FR.md">Français</a> |
  <a href="./README_DE.md">Deutsch</a> |
  <a href="./README_PT-BR.md">Português</a> |
  <a href="./README_RU.md">Русский</a> |
  <a href="./README_HI.md">हिन्दी</a> |
  <a href="./README_BN.md">বাংলা</a>
</p>

---

## FluxTurn কী?

FluxTurn হল একটি ওপেন-সোর্স ওয়ার্কফ্লো অটোমেশন প্ল্যাটফর্ম যা আপনাকে অ্যাপ সংযুক্ত করতে, প্রক্রিয়া স্বয়ংক্রিয় করতে এবং AI-চালিত ওয়ার্কফ্লো তৈরি করতে দেয় -- সবকিছু একটি ভিজ্যুয়াল বিল্ডার বা প্রাকৃতিক ভাষার মাধ্যমে।

**মূল সক্ষমতা:**

- **AI ওয়ার্কফ্লো জেনারেশন** -- সাধারণ ইংরেজিতে বর্ণনা করুন আপনি কী চান, একটি কার্যকর ওয়ার্কফ্লো পান
- **ভিজ্যুয়াল ওয়ার্কফ্লো বিল্ডার** -- ReactFlow দ্বারা চালিত ড্র্যাগ-এন্ড-ড্রপ ইন্টারফেস
- **১২০+ কানেক্টর** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI, এবং আরও অনেক কিছু
- **রিয়েল-টাইম এক্সিকিউশন** -- বিস্তারিত লগ এবং মনিটরিং সহ ওয়ার্কফ্লো চলতে দেখুন
- **সেল্ফ-হোস্টেড** -- Docker দিয়ে আপনার নিজের অবকাঠামোতে চালান

## দ্রুত শুরু

### Docker (প্রস্তাবিত)

প্রজেক্ট রুট থেকে এই কমান্ডগুলি চালান:

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
cp backend/.env.example backend/.env
# আপনার ডাটাবেস ক্রেডেনশিয়াল এবং JWT সিক্রেট দিয়ে backend/.env এডিট করুন
docker compose up -d
```

এটুকুই! `http://localhost:5173` এ অ্যাপ এবং `http://localhost:5005` এ API অ্যাক্সেস করুন।

### ম্যানুয়াল সেটআপ

**পূর্বশর্ত:** Node.js 18+, PostgreSQL 14+, Redis 7+

```bash
# ক্লোন করুন
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn

# ব্যাকএন্ড
cd backend
cp .env.example .env    # আপনার কনফিগারেশন দিয়ে .env এডিট করুন
npm install
npm run start:dev

# ফ্রন্টএন্ড (একটি নতুন টার্মিনালে)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## আর্কিটেকচার

```
                    +------------------+
                    |    Frontend      |  React 19 + Vite + Tailwind
                    |  (Port 5173)     |  Visual Workflow Builder
                    +--------+---------+  AI Chat Interface
                             |
                             v
                    +------------------+
                    |    Backend       |  NestJS + TypeScript
                    |  (Port 5005)     |  REST API + WebSocket
                    +--------+---------+  Workflow Engine
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
        +-----------+  +---------+  +----------+
        | PostgreSQL |  |  Redis  |  |  Qdrant  |
        | (Database) |  | (Cache) |  | (Vector) |
        +-----------+  +---------+  +----------+
```

**ফ্রন্টএন্ড** (`/frontend`) -- React 19, Vite, TailwindCSS, ReactFlow, i18next, CodeMirror

**ব্যাকএন্ড** (`/backend`) -- NestJS, PostgreSQL (raw SQL), Redis, Socket.IO, LangChain, ১২০+ কানেক্টর

## কানেক্টর

FluxTurn এই শ্রেণীগুলিতে ১২০+ কানেক্টর সহ আসে:

| শ্রেণী | কানেক্টর |
|----------|-----------|
| **AI এবং ML** | OpenAI, OpenAI Chatbot, Anthropic, Google AI, Google Gemini, AWS Bedrock |
| **অ্যানালিটিক্স** | Google Analytics, Grafana, Metabase, Mixpanel, PostHog, Segment, Splunk |
| **CMS** | WordPress, Contentful, Ghost, Medium, Webflow |
| **যোগাযোগ** | Slack, Gmail, Microsoft Teams, Telegram, Discord, Twilio, WhatsApp, AWS SES, SMTP, IMAP, POP3, Google Calendar, Calendly, Discourse, Matrix, Mattermost |
| **CRM এবং বিক্রয়** | HubSpot, Salesforce, Pipedrive, Zoho CRM, Airtable, Monday.com |
| **ডেটা প্রসেসিং** | Supabase, Scrapfly, Extract From File |
| **ডাটাবেস** | Elasticsearch |
| **ডেভেলপমেন্ট** | GitHub, GitLab, Bitbucket, Git, Jenkins, Travis CI, Netlify, n8n, npm |
| **ই-কমার্স** | Shopify, Stripe, PayPal, WooCommerce, Magento, Paddle, Gumroad |
| **অর্থ** | QuickBooks, Plaid, Chargebee, Wise, Xero |
| **ফর্ম** | Google Forms, Jotform, Typeform |
| **মার্কেটিং** | Mailchimp, Klaviyo, SendGrid, Brevo, ActiveCampaign, Google Ads, Facebook Ads |
| **উৎপাদনশীলতা** | Figma, Todoist, Spotify, Clockify, Toggl, Harvest |
| **প্রজেক্ট ম্যানেজমেন্ট** | Jira, Asana, Trello, Notion, Linear, ClickUp |
| **সোশ্যাল** | Twitter/X, Facebook, Instagram, TikTok, LinkedIn, Pinterest, Reddit |
| **স্টোরেজ** | Google Drive, Google Docs, Google Sheets, Dropbox, AWS S3, PostgreSQL, MySQL, MongoDB, Redis, Snowflake |
| **সাপোর্ট** | Zendesk, Intercom, Freshdesk, ServiceNow, PagerDuty, Sentry |
| **ইউটিলিটি** | Bitly, DeepL, FTP, SSH, Execute Command |
| **ভিডিও** | YouTube, Zoom |

[সব কানেক্টর দেখুন &rarr;](docs/connectors.md)

## i18n

FluxTurn i18next এর মাধ্যমে ১৭টি ভাষা সমর্থন করে:

- ইংরেজি, জাপানি, চীনা, কোরিয়ান, স্প্যানিশ, ফরাসি, জার্মান, ইতালিয়ান, রাশিয়ান, পর্তুগিজ (BR), ডাচ, পোলিশ, ইউক্রেনীয়, ভিয়েতনামী, ইন্দোনেশিয়ান, আরবি, হিন্দি

একটি নতুন ভাষা যোগ করতে চান? [অনুবাদ গাইড](docs/contributing/translations.md) দেখুন।

## অবদান

আমরা অবদানকে স্বাগত জানাই! শুরু করতে আমাদের [অবদান গাইড](CONTRIBUTING.md) দেখুন।

**অবদান রাখার উপায়:**
- [GitHub Issues](https://github.com/fluxturn/fluxturn/issues) এর মাধ্যমে বাগ রিপোর্ট করুন বা ফিচার অনুরোধ করুন
- বাগ ফিক্স বা নতুন ফিচারের জন্য পুল রিকোয়েস্ট জমা দিন
- নতুন কানেক্টর যোগ করুন ([কানেক্টর ডেভেলপমেন্ট গাইড](docs/guides/connector-development.md) দেখুন)
- ডকুমেন্টেশন উন্নত করুন
- অনুবাদ যোগ করুন

## অবদানকারী

FluxTurn-এ অবদান রাখা সকল অসাধারণ মানুষদের ধন্যবাদ! 🎉

<a href="https://github.com/fluxturn/fluxturn/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn" />
</a>

এখানে আপনার মুখ দেখতে চান? আমাদের [অবদান গাইড](CONTRIBUTING.md) দেখুন এবং আজই অবদান শুরু করুন!

## কমিউনিটি

- [Discord](https://discord.gg/fluxturn) -- টিম এবং কমিউনিটির সাথে চ্যাট করুন
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions) -- প্রশ্ন জিজ্ঞাসা করুন, ধারণা শেয়ার করুন
- [Twitter/X](https://twitter.com/fluxturn) -- আপডেটের জন্য ফলো করুন

## লাইসেন্স

এই প্রজেক্ট [Apache License 2.0](LICENSE) এর অধীনে লাইসেন্সপ্রাপ্ত।

## স্বীকৃতি

[NestJS](https://nestjs.com), [React](https://react.dev), [ReactFlow](https://reactflow.dev), [TypeScript](https://typescriptlang.org), এবং [i18next](https://i18next.com) দিয়ে নির্মিত।

---

<p align="center">
  <a href="https://fluxturn.com">ওয়েবসাইট</a> |
  <a href="https://github.com/fluxturn/fluxturn/wiki">ডক্স</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>
