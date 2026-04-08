<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/fluxturn_1.png" alt="FluxTurn" width="600">
  </a>
</p>

<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>ओपन-सोर्स AI-संचालित वर्कफ़्लो ऑटोमेशन प्लेटफ़ॉर्म</strong>
  </p>
  <p align="center">
    प्राकृतिक भाषा और विज़ुअल बिल्डर के साथ वर्कफ़्लो बनाएं, स्वचालित करें और व्यवस्थित करें।
  </p>
</p>

<p align="center">
  <a href="https://github.com/fluxturn/fluxturn/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License"></a>
  <a href="https://github.com/fluxturn/fluxturn/stargazers"><img src="https://img.shields.io/github/stars/fluxturn/fluxturn?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/fluxturn/fluxturn/issues"><img src="https://img.shields.io/github/issues/fluxturn/fluxturn" alt="Issues"></a>
  <a href="https://github.com/fluxturn/fluxturn/pulls"><img src="https://img.shields.io/github/issues-pr/fluxturn/fluxturn" alt="Pull Requests"></a>
  <a href="https://discord.gg/tpJZ9J3q"><img src="https://img.shields.io/discord/YOUR_DISCORD_ID?label=Discord&logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center">
  <a href="https://github.com/fluxturn/fluxturn/wiki">दस्तावेज़ीकरण</a> |
  <a href="#quick-start">त्वरित शुरुआत</a> |
  <a href="https://discord.gg/tpJZ9J3q">Discord</a> |
  <a href="CONTRIBUTING.md">योगदान</a>
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

## FluxTurn क्या है?

FluxTurn एक ओपन-सोर्स वर्कफ़्लो ऑटोमेशन प्लेटफ़ॉर्म है जो आपको ऐप्स को कनेक्ट करने, प्रक्रियाओं को स्वचालित करने और AI-संचालित वर्कफ़्लो बनाने की सुविधा देता है -- यह सब एक विज़ुअल बिल्डर या प्राकृतिक भाषा के माध्यम से।

**मुख्य क्षमताएं:**

- **AI वर्कफ़्लो जनरेशन** -- सरल अंग्रेज़ी में बताएं कि आप क्या चाहते हैं, एक कार्यशील वर्कफ़्लो प्राप्त करें
- **विज़ुअल वर्कफ़्लो बिल्डर** -- ReactFlow द्वारा संचालित ड्रैग-एंड-ड्रॉप इंटरफ़ेस
- **120+ कनेक्टर** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI, और भी बहुत कुछ
- **रियल-टाइम निष्पादन** -- विस्तृत लॉग और मॉनिटरिंग के साथ वर्कफ़्लो चलते हुए देखें
- **सेल्फ-होस्टेड** -- Docker के साथ अपने खुद के इंफ्रास्ट्रक्चर पर चलाएं

## त्वरित शुरुआत

### Docker (अनुशंसित)

प्रोजेक्ट रूट से ये कमांड चलाएं:

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
cp backend/.env.example backend/.env
# अपने डेटाबेस क्रेडेंशियल्स और JWT सीक्रेट के साथ backend/.env को एडिट करें
docker compose up -d
```

बस इतना ही! ऐप को `http://localhost:5173` पर और API को `http://localhost:5005` पर एक्सेस करें।

### मैनुअल सेटअप

**पूर्वापेक्षाएं:** Node.js 18+, PostgreSQL 14+, Redis 7+

```bash
# क्लोन करें
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn

# बैकएंड
cd backend
cp .env.example .env    # अपने कॉन्फ़िगरेशन के साथ .env एडिट करें
npm install
npm run start:dev

# फ्रंटएंड (एक नए टर्मिनल में)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## आर्किटेक्चर

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

**फ्रंटएंड** (`/frontend`) -- React 19, Vite, TailwindCSS, ReactFlow, i18next, CodeMirror

**बैकएंड** (`/backend`) -- NestJS, PostgreSQL (raw SQL), Redis, Socket.IO, LangChain, 120+ कनेक्टर

## कनेक्टर

FluxTurn इन श्रेणियों में 120+ कनेक्टर के साथ आता है:

| श्रेणी | कनेक्टर |
|----------|-----------|
| **AI और ML** | OpenAI, OpenAI Chatbot, Anthropic, Google AI, Google Gemini, AWS Bedrock |
| **एनालिटिक्स** | Google Analytics, Grafana, Metabase, Mixpanel, PostHog, Segment, Splunk |
| **CMS** | WordPress, Contentful, Ghost, Medium, Webflow |
| **संचार** | Slack, Gmail, Microsoft Teams, Telegram, Discord, Twilio, WhatsApp, AWS SES, SMTP, IMAP, POP3, Google Calendar, Calendly, Discourse, Matrix, Mattermost |
| **CRM और बिक्री** | HubSpot, Salesforce, Pipedrive, Zoho CRM, Airtable, Monday.com |
| **डेटा प्रोसेसिंग** | Supabase, Scrapfly, Extract From File |
| **डेटाबेस** | Elasticsearch |
| **डेवलपमेंट** | GitHub, GitLab, Bitbucket, Git, Jenkins, Travis CI, Netlify, n8n, npm |
| **ई-कॉमर्स** | Shopify, Stripe, PayPal, WooCommerce, Magento, Paddle, Gumroad |
| **वित्त** | QuickBooks, Plaid, Chargebee, Wise, Xero |
| **फॉर्म** | Google Forms, Jotform, Typeform |
| **मार्केटिंग** | Mailchimp, Klaviyo, SendGrid, Brevo, ActiveCampaign, Google Ads, Facebook Ads |
| **उत्पादकता** | Figma, Todoist, Spotify, Clockify, Toggl, Harvest |
| **प्रोजेक्ट मैनेजमेंट** | Jira, Asana, Trello, Notion, Linear, ClickUp |
| **सोशल** | Twitter/X, Facebook, Instagram, TikTok, LinkedIn, Pinterest, Reddit |
| **स्टोरेज** | Google Drive, Google Docs, Google Sheets, Dropbox, AWS S3, PostgreSQL, MySQL, MongoDB, Redis, Snowflake |
| **समर्थन** | Zendesk, Intercom, Freshdesk, ServiceNow, PagerDuty, Sentry |
| **यूटिलिटी** | Bitly, DeepL, FTP, SSH, Execute Command |
| **वीडियो** | YouTube, Zoom |

[सभी कनेक्टर देखें &rarr;](docs/connectors.md)

## i18n

FluxTurn i18next के माध्यम से 17 भाषाओं का समर्थन करता है:

- अंग्रेज़ी, जापानी, चीनी, कोरियाई, स्पेनिश, फ्रेंच, जर्मन, इतालवी, रूसी, पुर्तगाली (BR), डच, पोलिश, यूक्रेनियन, वियतनामी, इंडोनेशियाई, अरबी, हिंदी

एक नई भाषा जोड़ना चाहते हैं? [अनुवाद गाइड](docs/contributing/translations.md) देखें।

## योगदान

हम योगदान का स्वागत करते हैं! शुरू करने के लिए हमारी [योगदान गाइड](CONTRIBUTING.md) देखें।

**योगदान के तरीके:**
- [GitHub Issues](https://github.com/fluxturn/fluxturn/issues) के माध्यम से बग रिपोर्ट करें या सुविधाओं का अनुरोध करें
- बग फिक्स या नई सुविधाओं के लिए पुल रिक्वेस्ट सबमिट करें
- नए कनेक्टर जोड़ें ([कनेक्टर डेवलपमेंट गाइड](docs/guides/connector-development.md) देखें)
- दस्तावेज़ीकरण में सुधार करें
- अनुवाद जोड़ें

## योगदानकर्ता

FluxTurn में योगदान देने वाले सभी अद्भुत लोगों को धन्यवाद! 🎉

<a href="https://github.com/fluxturn/fluxturn/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn" />
</a>

यहां अपना चेहरा देखना चाहते हैं? हमारी [योगदान गाइड](CONTRIBUTING.md) देखें और आज ही योगदान शुरू करें!

## समुदाय

- [Discord](https://discord.gg/tpJZ9J3q) -- टीम और समुदाय के साथ चैट करें
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions) -- प्रश्न पूछें, विचार साझा करें
- [Twitter/X](https://twitter.com/fluxturn) -- अपडेट के लिए फॉलो करें

## लाइसेंस

यह प्रोजेक्ट [Apache License 2.0](LICENSE) के तहत लाइसेंस प्राप्त है।

## आभार

[NestJS](https://nestjs.com), [React](https://react.dev), [ReactFlow](https://reactflow.dev), [TypeScript](https://typescriptlang.org), और [i18next](https://i18next.com) के साथ निर्मित।

---

<p align="center">
  <a href="https://fluxturn.com">वेबसाइट</a> |
  <a href="https://github.com/fluxturn/fluxturn/wiki">दस्तावेज़</a> |
  <a href="https://discord.gg/tpJZ9J3q">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>
