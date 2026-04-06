<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/fluxturn_1.png" alt="FluxTurn" width="600">
  </a>
</p>

<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>오픈소스 AI 기반 워크플로우 자동화 플랫폼</strong>
  </p>
  <p align="center">
    자연어와 비주얼 빌더로 워크플로우를 구축, 자동화, 오케스트레이션하세요.
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
  <a href="https://github.com/fluxturn/fluxturn/wiki">문서</a> |
  <a href="#quick-start">빠른 시작</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="CONTRIBUTING.md">기여하기</a>
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

## FluxTurn이란?

FluxTurn은 앱 연결, 프로세스 자동화, AI 기반 워크플로우 구축을 가능하게 하는 오픈소스 워크플로우 자동화 플랫폼입니다 -- 비주얼 빌더 또는 자연어로 모든 작업을 수행할 수 있습니다.

**주요 기능:**

- **AI 워크플로우 생성** -- 간단한 한국어로 원하는 것을 설명하면 작동하는 워크플로우를 얻을 수 있습니다
- **비주얼 워크플로우 빌더** -- ReactFlow 기반의 드래그 앤 드롭 인터페이스
- **120개 이상의 커넥터** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI 등
- **실시간 실행** -- 상세한 로그와 모니터링으로 워크플로우 실행 관찰
- **자체 호스팅** -- Docker를 사용하여 자체 인프라에서 실행

## 빠른 시작

### Docker (권장)

프로젝트 루트에서 다음 명령을 실행하세요:

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
cp backend/.env.example backend/.env
# 데이터베이스 자격 증명과 JWT 비밀로 backend/.env를 편집하세요
docker compose up -d
```

이게 전부입니다! `http://localhost:5173`에서 앱에, `http://localhost:5005`에서 API에 접근하세요.

### 수동 설정

**전제 조건:** Node.js 18+, PostgreSQL 14+, Redis 7+

```bash
# 클론
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn

# 백엔드
cd backend
cp .env.example .env    # 구성으로 .env 편집
npm install
npm run start:dev

# 프론트엔드 (새 터미널에서)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## 아키텍처

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

**프론트엔드** (`/frontend`) -- React 19, Vite, TailwindCSS, ReactFlow, i18next, CodeMirror

**백엔드** (`/backend`) -- NestJS, PostgreSQL (raw SQL), Redis, Socket.IO, LangChain, 120개 이상의 커넥터

## 커넥터

FluxTurn은 다음 카테고리에서 120개 이상의 커넥터를 제공합니다:

| 카테고리 | 커넥터 |
|----------|-----------|
| **AI 및 ML** | OpenAI, OpenAI Chatbot, Anthropic, Google AI, Google Gemini, AWS Bedrock |
| **분석** | Google Analytics, Grafana, Metabase, Mixpanel, PostHog, Segment, Splunk |
| **CMS** | WordPress, Contentful, Ghost, Medium, Webflow |
| **커뮤니케이션** | Slack, Gmail, Microsoft Teams, Telegram, Discord, Twilio, WhatsApp, AWS SES, SMTP, IMAP, POP3, Google Calendar, Calendly, Discourse, Matrix, Mattermost |
| **CRM 및 영업** | HubSpot, Salesforce, Pipedrive, Zoho CRM, Airtable, Monday.com |
| **데이터 처리** | Supabase, Scrapfly, Extract From File |
| **데이터베이스** | Elasticsearch |
| **개발** | GitHub, GitLab, Bitbucket, Git, Jenkins, Travis CI, Netlify, n8n, npm |
| **전자상거래** | Shopify, Stripe, PayPal, WooCommerce, Magento, Paddle, Gumroad |
| **금융** | QuickBooks, Plaid, Chargebee, Wise, Xero |
| **양식** | Google Forms, Jotform, Typeform |
| **마케팅** | Mailchimp, Klaviyo, SendGrid, Brevo, ActiveCampaign, Google Ads, Facebook Ads |
| **생산성** | Figma, Todoist, Spotify, Clockify, Toggl, Harvest |
| **프로젝트 관리** | Jira, Asana, Trello, Notion, Linear, ClickUp |
| **소셜** | Twitter/X, Facebook, Instagram, TikTok, LinkedIn, Pinterest, Reddit |
| **스토리지** | Google Drive, Google Docs, Google Sheets, Dropbox, AWS S3, PostgreSQL, MySQL, MongoDB, Redis, Snowflake |
| **지원** | Zendesk, Intercom, Freshdesk, ServiceNow, PagerDuty, Sentry |
| **유틸리티** | Bitly, DeepL, FTP, SSH, Execute Command |
| **비디오** | YouTube, Zoom |

[모든 커넥터 보기 &rarr;](docs/connectors.md)

## i18n

FluxTurn은 i18next를 통해 17개 언어를 지원합니다:

- 영어, 일본어, 중국어, 한국어, 스페인어, 프랑스어, 독일어, 이탈리아어, 러시아어, 포르투갈어(BR), 네덜란드어, 폴란드어, 우크라이나어, 베트남어, 인도네시아어, 아랍어, 힌디어

새로운 언어를 추가하고 싶으신가요? [번역 가이드](docs/contributing/translations.md)를 참조하세요.

## 기여하기

기여를 환영합니다! [기여 가이드](CONTRIBUTING.md)를 참조하여 시작하세요.

**기여 방법:**
- [GitHub Issues](https://github.com/fluxturn/fluxturn/issues)를 통해 버그 보고 또는 기능 요청
- 버그 수정 또는 새 기능에 대한 풀 리퀘스트 제출
- 새 커넥터 추가 ([커넥터 개발 가이드](docs/guides/connector-development.md) 참조)
- 문서 개선
- 번역 추가

## 기여자

FluxTurn에 기여해주신 모든 훌륭한 분들께 감사드립니다! 🎉

<a href="https://github.com/fluxturn/fluxturn/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn" />
</a>

여기에 당신의 얼굴을 보고 싶으신가요? [기여 가이드](CONTRIBUTING.md)를 확인하고 오늘 기여를 시작하세요!

## 커뮤니티

- [Discord](https://discord.gg/fluxturn) -- 팀 및 커뮤니티와 채팅
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions) -- 질문하고 아이디어 공유
- [Twitter/X](https://twitter.com/fluxturn) -- 업데이트를 위해 팔로우

## 라이선스

이 프로젝트는 [Apache License 2.0](LICENSE)에 따라 라이선스가 부여됩니다.

## 감사의 말

[NestJS](https://nestjs.com), [React](https://react.dev), [ReactFlow](https://reactflow.dev), [TypeScript](https://typescriptlang.org), [i18next](https://i18next.com)로 구축되었습니다.

---

<p align="center">
  <a href="https://fluxturn.com">웹사이트</a> |
  <a href="https://github.com/fluxturn/fluxturn/wiki">문서</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>
