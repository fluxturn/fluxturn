<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/Exploring the Future of Technology.png" alt="FluxTurn" width="600">
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
  <a href="https://discord.gg/tpJZ9J3q"><img src="https://img.shields.io/discord/YOUR_DISCORD_ID?label=Discord&logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center">
  <a href="https://github.com/fluxturn/fluxturn/wiki">문서</a> |
  <a href="#quick-start">빠른 시작</a> |
  <a href="https://discord.gg/tpJZ9J3q">Discord</a> |
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

FluxTurn은 아이디어와 실행 사이의 격차를 해소하는 **프로덕션 준비가 완료된 오픈소스 워크플로우 자동화 플랫폼**입니다. 개발자, DevOps 팀 및 기술 사용자를 위해 구축된 FluxTurn은 AI 기반 워크플로우 생성의 강력함과 정교한 비주얼 빌더를 결합하여 몇 시간이 아닌 몇 초 만에 복잡한 프로세스를 자동화할 수 있도록 도와줍니다.

광범위한 구성이 필요한 기존 자동화 도구나 유연성을 희생하는 로우코드 플랫폼과 달리, FluxTurn은 두 가지 장점을 모두 제공합니다: 자연어 워크플로우 생성의 속도와 비주얼 노드 기반 에디터의 정밀함.

<p align="center">
  <img src="frontend/public/fluxturn_demo.png" alt="FluxTurn Visual Workflow Builder" width="800">
  <br>
  <em>채팅 메모리를 갖춘 AI 에이전트 워크플로우를 보여주는 FluxTurn의 비주얼 워크플로우 빌더</em>
</p>

### 작동 방식

1. **워크플로우 설명** -- 자동화하려는 내용을 일반 한국어로 FluxTurn에 알려주세요
2. **AI가 플로우 생성** -- AI 에이전트가 요구 사항을 분석하고 적절한 커넥터로 완전한 워크플로우를 생성합니다
3. **비주얼 개선** -- ReactFlow 기반 캔버스를 사용하여 생성된 워크플로우를 미세 조정하세요
4. **배포 및 모니터링** -- 상세한 로깅 및 WebSocket 기반 모니터링으로 워크플로우를 실시간으로 실행하세요

### 주요 기능

- **🤖 AI 워크플로우 생성** -- 일반 한국어로 원하는 것을 설명하면 적절한 오류 처리 및 모범 사례가 포함된 작동하는 워크플로우를 얻을 수 있습니다
- **🎨 비주얼 워크플로우 빌더** -- 실시간 검증 기능이 있는 ReactFlow 기반 드래그 앤 드롭 인터페이스
- **🔌 120개 이상의 사전 구축된 커넥터** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI, Anthropic 등
- **⚡ 실시간 실행** -- 상세한 로그, WebSocket 업데이트 및 성능 메트릭으로 워크플로우 실행을 관찰하세요
- **🏠 자체 호스팅 및 프라이버시 우선** -- Docker를 사용하여 자체 인프라에서 실행, 완전한 데이터 제어
- **🌍 다국어 지원** -- 영어, 일본어, 중국어, 한국어, 스페인어 등 17개 언어 지원
- **🔄 프로덕션 준비 완료** -- 엔터프라이즈급 배포를 위해 NestJS, PostgreSQL, Redis 및 Qdrant로 구축

## 해결하는 문제

### 자동화 딜레마

현대 팀은 중요한 과제에 직면해 있습니다: **자동화는 필수적이지만 시간이 많이 소요됩니다**. 도구 간 통합 구축, 오류 처리 및 워크플로우 유지 관리에는 상당한 엔지니어링 리소스가 필요합니다.

**우리가 해결하는 일반적인 문제점:**

- ❌ **수동 통합 지옥** -- 다양한 API를 연결하기 위한 맞춤형 스크립트 작성에 몇 시간 또는 며칠이 소요됩니다
- ❌ **비싼 SaaS 종속성** -- 상용 자동화 도구는 워크플로우 실행 또는 사용자 좌석당 요금을 부과합니다
- ❌ **제한된 유연성** -- 로우코드 플랫폼은 시작하기는 쉽지만 복잡한 사용 사례에 맞게 사용자 지정하기 어렵습니다
- ❌ **공급업체 종속성** -- 클라우드 전용 솔루션은 자동화 로직이나 데이터를 소유하지 못한다는 것을 의미합니다
- ❌ **가파른 학습 곡선** -- 기존 워크플로우 엔진은 설정하기 위해 깊은 기술 지식이 필요합니다

### FluxTurn의 솔루션

✅ **AI 기반 속도** -- 몇 시간이 아닌 몇 초 만에 아이디어를 작동하는 워크플로우로 전환하세요
✅ **오픈 소스 자유** -- 공급업체 종속성 없음, 실행당 수수료 없음, 코드에 대한 완전한 제어
✅ **자체 호스팅 프라이버시** -- 민감한 데이터 및 워크플로우를 자체 인프라에 보관하세요
✅ **개발자 친화적** -- 완전한 API 액세스, 확장 가능한 커넥터 시스템, TypeScript 코드베이스
✅ **비주얼 + 코드** -- AI 생성으로 시작하고, 시각적으로 개선하고, 필요한 경우 코드로 내보내세요

## FluxTurn을 선택하는 이유 (비교)

| 기능 | FluxTurn | Zapier/Make | n8n | Temporal | 맞춤형 스크립트 |
|---------|----------|-------------|-----|----------|----------------|
| **AI 워크플로우 생성** | ✅ 내장 | ❌ | ❌ | ❌ | ❌ |
| **비주얼 빌더** | ✅ ReactFlow | ✅ | ✅ | ❌ | ❌ |
| **자체 호스팅** | ✅ 무료 | ❌ | ✅ | ✅ | ✅ |
| **오픈 소스** | ✅ Apache 2.0 | ❌ | ✅ Fair-code | ✅ MIT | N/A |
| **사전 구축된 커넥터** | ✅ 120+ | ✅ 5000+ | ✅ 400+ | ❌ | ❌ |
| **실시간 모니터링** | ✅ WebSocket | ✅ | ✅ | ✅ | ❌ |
| **다국어 UI** | ✅ 17개 언어 | ✅ | ❌ | ❌ | N/A |
| **실행당 비용 없음** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **프로덕션 준비 완료** | ✅ NestJS | ✅ | ✅ | ✅ | ⚠️ |
| **자연어 입력** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **벡터 검색 (Qdrant)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **학습 곡선** | 🟢 낮음 | 🟢 낮음 | 🟡 중간 | 🔴 높음 | 🔴 높음 |

### FluxTurn의 독특한 점은?

1. **AI 우선 디자인** -- 네이티브 AI 워크플로우 생성 및 자연어 이해 기능을 갖춘 유일한 워크플로우 플랫폼
2. **최신 기술 스택** -- React 19, NestJS, PostgreSQL, Redis, Qdrant -- 2025년 이후를 위해 구축됨
3. **개발자 경험** -- 깔끔한 TypeScript 코드베이스, 확장 가능한 아키텍처, 포괄적인 API
4. **진정한 오픈 소스** -- Apache 2.0 라이선스, "fair-code" 제한 없음, 커뮤니티 주도 개발
5. **다중 모달 입력** -- 자연어 OR 비주얼 빌더 OR API -- 팀에 적합한 것을 선택하세요

## 📊 프로젝트 활동 및 통계

FluxTurn은 성장하는 커뮤니티와 함께 **적극적으로 유지 관리되는** 프로젝트입니다. 현재 진행 상황은 다음과 같습니다:

### GitHub 활동

<p align="left">
  <img src="https://img.shields.io/github/stars/fluxturn/fluxturn?style=for-the-badge&logo=github&color=yellow" alt="GitHub Stars">
  <img src="https://img.shields.io/github/forks/fluxturn/fluxturn?style=for-the-badge&logo=github&color=blue" alt="Forks">
  <img src="https://img.shields.io/github/contributors/fluxturn/fluxturn?style=for-the-badge&logo=github&color=green" alt="Contributors">
  <img src="https://img.shields.io/github/last-commit/fluxturn/fluxturn?style=for-the-badge&logo=github&color=orange" alt="Last Commit">
</p>

<p align="left">
  <img src="https://img.shields.io/github/issues/fluxturn/fluxturn?style=for-the-badge&logo=github&color=red" alt="Open Issues">
  <img src="https://img.shields.io/github/issues-pr/fluxturn/fluxturn?style=for-the-badge&logo=github&color=purple" alt="Open PRs">
  <img src="https://img.shields.io/github/issues-closed/fluxturn/fluxturn?style=for-the-badge&logo=github&color=green" alt="Closed Issues">
  <img src="https://img.shields.io/github/issues-pr-closed/fluxturn/fluxturn?style=for-the-badge&logo=github&color=blue" alt="Closed PRs">
</p>

### 커뮤니티 지표

| 지표 | 상태 | 세부사항 |
|--------|--------|---------|
| **총 기여자** | ![Contributors](https://img.shields.io/github/contributors/fluxturn/fluxturn?style=flat-square) | 성장하는 개발자 커뮤니티 |
| **총 커밋** | ![Commits](https://img.shields.io/github/commit-activity/t/fluxturn/fluxturn?style=flat-square) | 지속적인 개발 |
| **월간 커밋** | ![Commit Activity](https://img.shields.io/github/commit-activity/m/fluxturn/fluxturn?style=flat-square) | 적극적인 유지 관리 |
| **평균 PR 검토 시간** | ~24-48시간 | 빠른 피드백 루프 |
| **코드 품질** | ![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen?style=flat-square) | TypeScript, ESLint, Prettier |
| **테스트 커버리지** | ![Coverage](https://img.shields.io/badge/coverage-85%25-green?style=flat-square) | 충분히 테스트된 코드베이스 |
| **문서화** | ![Docs](https://img.shields.io/badge/docs-comprehensive-blue?style=flat-square) | 광범위한 가이드 및 API 문서 |

### 언어 및 코드 통계

<p align="left">
  <img src="https://img.shields.io/github/languages/top/fluxturn/fluxturn?style=for-the-badge&logo=typescript&color=blue" alt="Top Language">
  <img src="https://img.shields.io/github/languages/count/fluxturn/fluxturn?style=for-the-badge&color=purple" alt="Language Count">
  <img src="https://img.shields.io/github/repo-size/fluxturn/fluxturn?style=for-the-badge&color=orange" alt="Repo Size">
  <img src="https://img.shields.io/github/license/fluxturn/fluxturn?style=for-the-badge&color=green" alt="License">
</p>

### 최근 활동 하이라이트

- ✅ **120개 이상의 커넥터** 출시 및 테스트 완료
- ✅ **17개 언어** UI 지원
- ✅ **1000개 이상의 커밋** 계속 증가 중
- ✅ **활발한 Discord** 실시간 지원 커뮤니티
- ✅ **주간 릴리스** 새로운 기능 및 버그 수정
- ✅ **반응이 빠른 관리자** -- 1-2일 내 PR 검토

### 이 수치가 중요한 이유

**빠른 PR 검토** -- 우리는 여러분의 시간을 소중하게 생각합니다. 대부분의 풀 리퀘스트는 몇 주가 아닌 24-48시간 내에 초기 피드백을 받습니다.

**적극적인 개발** -- 정기적인 커밋은 프로젝트가 발전하고 있음을 의미합니다. 새로운 기능, 버그 수정 및 개선 사항이 지속적으로 제공됩니다.

**증가하는 기여자** -- 더 많은 기여자 = 더 많은 관점, 더 나은 코드 품질 및 더 빠른 기능 개발.

**높은 테스트 커버리지** -- 85% 이상의 커버리지는 테스트가 회귀를 포착할 것이라는 확신을 가지고 기여할 수 있음을 의미합니다.

**포괄적인 문서** -- 상세한 문서는 고민하는 시간이 적고 구축하는 시간이 많다는 것을 의미합니다.

### 활동에 참여하세요!

여기에서 여러분의 기여를 보고 싶으신가요? 아래의 [빠른 기여 가이드](#-빠른-기여-가이드)를 확인하세요!

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

이게 전부입니다! `http://localhost:5185`에서 앱에, `http://localhost:5005`에서 API에 접근하세요.

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
                    |  (Port 5185)     |  Visual Workflow Builder
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

## 🚀 FluxTurn에 기여하는 이유

FluxTurn은 단순한 오픈소스 프로젝트가 아닙니다 -- 전 세계 개발자들의 실제 문제를 해결하는 무언가를 구축하면서 최첨단 기술을 다룰 수 있는 기회입니다.

### 얻을 수 있는 것

**📚 최신 기술 스택 학습**
- **React 19** -- 서버 컴포넌트를 포함한 최신 React 기능
- **NestJS** -- 엔터프라이즈에서 사용하는 전문 백엔드 프레임워크
- **LangChain** -- AI/ML 통합 및 에이전트 오케스트레이션
- **벡터 데이터베이스** -- 시맨틱 검색을 위한 Qdrant 작업
- **ReactFlow** -- 인터랙티브 노드 기반 UI 구축
- **실시간 시스템** -- WebSocket, Redis 및 이벤트 기반 아키텍처

**💼 포트폴리오 구축**
- 실제 회사에서 사용하는 **프로덕션 준비 완료** 플랫폼에 기여하세요
- GitHub 프로필에 표시되는 기능 작업
- 기여자 명예의 전당에서 인정받기
- **워크플로우 자동화** 및 **AI 통합** 전문 지식 구축 -- 2026년에 매우 가치 있는 기술

**🤝 성장하는 커뮤니티에 참여**
- 전 세계의 개발자들과 연결하세요
- 경험 많은 관리자로부터 코드 리뷰를 받으세요
- 소프트웨어 아키텍처의 모범 사례를 배우세요
- 기술 토론 및 디자인 결정에 참여하세요

**🎯 실제 영향력 발휘**
- 여러분의 코드는 수천 명의 개발자가 워크플로우를 자동화하는 데 도움이 됩니다
- 프로덕션 환경에서 사용되는 기능을 확인하세요
- AI 기반 자동화 플랫폼의 방향에 영향을 미치세요

**⚡ 빠른 온보딩**
- Docker 기반 설정으로 **5분 이내**에 실행 가능
- 명확한 아키텍처를 갖춘 잘 문서화된 코드베이스
- 24-48시간 내에 PR에 응답하는 친절한 관리자
- 신규 참여자를 위한 "Good first issue" 라벨

## 🗺️ 프로젝트 로드맵

우리가 구축하고 있는 것과 여러분이 기여할 수 있는 곳입니다. 🆘로 표시된 항목은 도움이 필요합니다!

### 2026년 2분기 (현재 분기)

**🤖 AI 및 인텔리전스**
- [ ] 🆘 **AI 워크플로우 최적화** -- 워크플로우에 대한 성능 개선 자동 제안
- [ ] **멀티 에이전트 워크플로우** -- 조정 기능이 있는 병렬 AI 에이전트 지원
- [ ] 🆘 **자연어 워크플로우 편집** -- "3단계에 오류 처리 추가"로 워크플로우 업데이트
- [ ] **스마트 커넥터 제안** -- AI가 워크플로우 컨텍스트를 기반으로 커넥터 추천

**🔌 커넥터 및 통합**
- [ ] 🆘 **50개 이상의 새 커넥터** -- Notion, Linear, Airtable, Make.com 등
- [ ] **커넥터 마켓플레이스** -- 커뮤니티 기여 커넥터
- [ ] 🆘 **GraphQL 지원** -- 최신 API용 GraphQL 커넥터 추가
- [ ] **데이터베이스 커넥터** -- Supabase, PlanetScale, Neon 개선

**🎨 비주얼 빌더 개선**
- [ ] 🆘 **워크플로우 템플릿** -- 일반적인 사용 사례를 위한 사전 구축된 템플릿
- [ ] **조건부 분기 UI** -- 비주얼 if/else 플로우 빌더
- [ ] 🆘 **워크플로우 버전 관리** -- 워크플로우 변경 사항 추적 및 롤백
- [ ] **협업 편집** -- 동일한 워크플로우를 편집하는 여러 사용자

### 2026년 3분기

**⚡ 성능 및 확장**
- [ ] **분산 실행** -- 여러 워커에서 워크플로우 실행
- [ ] 🆘 **워크플로우 캐싱** -- 비용이 많이 드는 작업 캐싱
- [ ] **커넥터당 속도 제한** -- 자동 백오프 및 재시도
- [ ] **수평적 확장** -- Redis pub/sub을 사용한 다중 인스턴스 지원

**🔐 엔터프라이즈 기능**
- [ ] **RBAC (역할 기반 액세스 제어)** -- 사용자 권한 및 팀
- [ ] 🆘 **감사 로그** -- 모든 워크플로우 변경 및 실행 추적
- [ ] **SSO 통합** -- SAML, OAuth2, LDAP 지원
- [ ] **비밀 관리** -- HashiCorp Vault 통합

**📊 모니터링 및 관찰성**
- [ ] 🆘 **메트릭 대시보드** -- 실행 시간, 성공률, 오류 추적
- [ ] **OpenTelemetry 통합** -- Jaeger, Datadog 등으로 추적 내보내기
- [ ] **경고 시스템** -- 워크플로우 실패 시 알림
- [ ] 🆘 **워크플로우 분석** -- 사용 패턴 및 최적화 권장 사항

### 2026년 4분기 및 그 이후

**🌐 플랫폼 확장**
- [ ] **CLI 도구** -- 터미널에서 워크플로우 관리
- [ ] 🆘 **코드로서의 워크플로우** -- YAML/JSON으로 워크플로우 정의
- [ ] **CI/CD 통합** -- GitHub Actions, GitLab CI 커넥터
- [ ] **모바일 앱** -- iOS/Android 워크플로우 모니터링

**🧩 개발자 경험**
- [ ] 🆘 **플러그인 시스템** -- 플러그인을 통한 맞춤형 노드 및 커넥터
- [ ] **워크플로우 테스트 프레임워크** -- 워크플로우를 위한 단위 테스트
- [ ] **로컬 개발 모드** -- 오프라인 워크플로우 개발
- [ ] **API 스키마 검증** -- 커넥터 응답 자동 검증

### 로드맵에 영향을 미치는 방법

💡 **아이디어가 있으신가요?** [GitHub Discussion](https://github.com/fluxturn/fluxturn/discussions)을 열거나 [Discord](https://discord.gg/tpJZ9J3q)에 참여하세요

🗳️ **기능에 투표** -- 관심 있는 이슈에 스타를 눌러 우선순위를 정하는 데 도움을 주세요

🛠️ **목록에 없는 것을 구축하고 싶으신가요?** -- 제안하세요! 우리는 커뮤니티 주도 기능을 환영합니다

## 🎯 빠른 기여 가이드

**10분 이내**에 기여를 시작하세요:

### 1단계: 환경 설정

```bash
# GitHub에서 저장소를 포크한 다음 포크를 클론하세요
git clone https://github.com/YOUR_USERNAME/fluxturn.git
cd fluxturn

# Docker로 시작 (가장 쉬운 방법)
cp backend/.env.example backend/.env
docker compose up -d

# 앱에 접근
# 프론트엔드: http://localhost:5185
# 백엔드 API: http://localhost:5005
```

**이게 전부입니다!** 이제 FluxTurn을 로컬에서 실행하고 있습니다.

### 2단계: 작업할 항목 찾기

경험 수준에 따라 선택하세요:

**🟢 초보자 친화적**
- 📝 [오타 수정 또는 문서 개선](https://github.com/fluxturn/fluxturn/labels/documentation)
- 🌍 [번역 추가](https://github.com/fluxturn/fluxturn/labels/i18n) -- 17개 언어 지원
- 🐛 [간단한 버그 수정](https://github.com/fluxturn/fluxturn/labels/good%20first%20issue)
- ✨ [UI/UX 개선](https://github.com/fluxturn/fluxturn/labels/ui%2Fux)

**🟡 중급**
- 🔌 [새 커넥터 추가](https://github.com/fluxturn/fluxturn/labels/connector) -- [커넥터 개발 가이드](docs/guides/connector-development.md) 참조
- 🎨 [비주얼 빌더 개선](https://github.com/fluxturn/fluxturn/labels/visual-builder)
- 🧪 [테스트 작성](https://github.com/fluxturn/fluxturn/labels/tests)
- 🚀 [성능 개선](https://github.com/fluxturn/fluxturn/labels/performance)

**🔴 고급**
- 🤖 [AI/ML 기능](https://github.com/fluxturn/fluxturn/labels/ai)
- ⚙️ [핵심 엔진 개선](https://github.com/fluxturn/fluxturn/labels/core)
- 🏗️ [아키텍처 개선](https://github.com/fluxturn/fluxturn/labels/architecture)
- 🔐 [보안 기능](https://github.com/fluxturn/fluxturn/labels/security)

### 3단계: 변경 사항 만들기

```bash
# 새 브랜치 생성
git checkout -b feature/your-feature-name

# 변경 사항 만들기
# - 프론트엔드 코드: /frontend/src
# - 백엔드 코드: /backend/src
# - 커넥터: /backend/src/modules/fluxturn/connectors

# 변경 사항 테스트
npm run test

# 명확한 메시지로 커밋
git commit -m "feat: add new connector for Notion API"
```

### 4단계: 풀 리퀘스트 제출

```bash
# 포크로 푸시
git push origin feature/your-feature-name

# GitHub에서 PR 열기
# - 변경 사항과 이유를 설명하세요
# - 관련 이슈에 링크하세요
# - UI 변경인 경우 스크린샷을 추가하세요
```

**다음은 어떻게 되나요?**
- ✅ PR에서 자동화된 테스트가 실행됩니다
- 👀 관리자가 코드를 검토합니다 (보통 24-48시간 이내)
- 💬 변경 사항이나 개선 사항을 제안할 수 있습니다
- 🎉 승인되면 코드가 병합됩니다!

### 기여 팁

✨ **작게 시작** -- 첫 번째 PR이 대규모 기능일 필요는 없습니다
📖 **코드 읽기** -- 기존 커넥터 또는 컴포넌트를 예제로 살펴보세요
❓ **질문하기** -- 막히면 [Discord](https://discord.gg/tpJZ9J3q)에 참여하세요
🧪 **테스트 작성** -- 테스트가 있는 PR은 더 빨리 병합됩니다
📝 **코드 문서화** -- 복잡한 로직에 주석을 추가하세요

### 도움이 필요하신가요?

- 💬 [Discord](https://discord.gg/tpJZ9J3q) -- 관리자 및 기여자와 채팅
- 📖 [기여 가이드](CONTRIBUTING.md) -- 상세한 기여 가이드라인
- 🐛 [GitHub Issues](https://github.com/fluxturn/fluxturn/issues) -- 버그 보고 또는 기능 요청
- 💡 [Discussions](https://github.com/fluxturn/fluxturn/discussions) -- 질문하고 아이디어 공유

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
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn&anon=1&max=100&columns=10" />
</a>

여기에 당신의 얼굴을 보고 싶으신가요? [기여 가이드](CONTRIBUTING.md)를 확인하고 오늘 기여를 시작하세요!

## 💬 커뮤니티에 참여하세요

개발자들과 소통하고, 도움을 받고, FluxTurn의 최신 개발 소식을 받아보세요!

<p align="center">
  <a href="https://discord.gg/tpJZ9J3q">
    <img src="https://img.shields.io/badge/Discord-Join%20Our%20Server-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord">
  </a>
  <a href="https://github.com/fluxturn/fluxturn/discussions">
    <img src="https://img.shields.io/badge/GitHub-Discussions-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Discussions">
  </a>
  <a href="https://twitter.com/fluxturn">
    <img src="https://img.shields.io/badge/Twitter-Follow%20Us-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter">
  </a>
</p>

### 우리를 찾을 수 있는 곳

| 플랫폼 | 목적 | 링크 |
|----------|---------|------|
| 💬 **Discord** | 실시간 채팅, 도움 받기, 기능 토론 | [서버 참여](https://discord.gg/tpJZ9J3q) |
| 💡 **GitHub Discussions** | 질문하기, 아이디어 공유, 기능 요청 | [토론 시작](https://github.com/fluxturn/fluxturn/discussions) |
| 🐦 **Twitter/X** | 제품 업데이트, 공지사항, 팁 | [@fluxturn](https://twitter.com/fluxturn) |
| 📧 **Email** | 관리자에게 직접 연락 | support@fluxturn.com |
| 🌐 **Website** | 문서, 가이드, 블로그 | [fluxturn.com](https://fluxturn.com) |

### 커뮤니티 가이드라인

- 🤝 **존중하기** -- 모든 사람을 존중과 친절로 대하세요
- 💡 **지식 공유** -- 다른 사람들이 배우고 성장할 수 있도록 도와주세요
- 🐛 **문제 보고** -- 버그를 찾으셨나요? GitHub Issues에서 알려주세요
- 🎉 **승리 축하** -- 워크플로우와 성공 사례를 공유하세요
- 🌍 **글로벌하게 생각** -- 우리는 17개 이상의 언어를 가진 전 세계 커뮤니티입니다

## 라이선스

이 프로젝트는 [Apache License 2.0](LICENSE)에 따라 라이선스가 부여됩니다.

## 감사의 말

[NestJS](https://nestjs.com), [React](https://react.dev), [ReactFlow](https://reactflow.dev), [TypeScript](https://typescriptlang.org), [i18next](https://i18next.com)로 구축되었습니다.

---

<p align="center">
  <a href="https://fluxturn.com">웹사이트</a> |
  <a href="https://github.com/fluxturn/fluxturn/wiki">문서</a> |
  <a href="https://discord.gg/tpJZ9J3q">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>

---

<p align="center">
  <strong> <a href="https://fluxturn.com">fluxturn</a> 커뮤니티가 ❤️로 만듦</strong>
</p>

<p align="center">
  이 프로젝트가 유용하다면 스타를 주는 것을 고려해주세요! ⭐
  <br><br>
  <a href="https://github.com/fluxturn/fluxturn/stargazers">
    <img src="https://img.shields.io/github/stars/fluxturn/fluxturn?style=social" alt="Star on GitHub">
  </a>
</p>
