<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/fluxturn_1.png" alt="FluxTurn" width="600">
  </a>
</p>

<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>Платформа автоматизации рабочих процессов с открытым исходным кодом на базе ИИ</strong>
  </p>
  <p align="center">
    Создавайте, автоматизируйте и управляйте рабочими процессами с помощью естественного языка и визуального конструктора.
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
  <a href="https://github.com/fluxturn/fluxturn/wiki">Документация</a> |
  <a href="#quick-start">Быстрый Старт</a> |
  <a href="https://discord.gg/tpJZ9J3q">Discord</a> |
  <a href="CONTRIBUTING.md">Вклад</a>
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

## Что такое FluxTurn?

FluxTurn -- это платформа автоматизации рабочих процессов с открытым исходным кодом, которая позволяет подключать приложения, автоматизировать процессы и создавать рабочие процессы на базе ИИ -- всё через визуальный конструктор или естественный язык.

**Основные возможности:**

- **Генерация Рабочих Процессов с ИИ** -- Опишите на простом русском, что вы хотите, получите рабочий процесс
- **Визуальный Конструктор Рабочих Процессов** -- Интерфейс перетаскивания на базе ReactFlow
- **Более 120 Коннекторов** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI и многое другое
- **Выполнение в Реальном Времени** -- Наблюдайте за выполнением рабочих процессов с подробными логами и мониторингом
- **Самостоятельный Хостинг** -- Запускайте на собственной инфраструктуре с Docker

## Быстрый Старт

### Docker (Рекомендуется)

Выполните эти команды из корня проекта:

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
cp backend/.env.example backend/.env
# Отредактируйте backend/.env с вашими учетными данными базы данных и JWT секретом
docker compose up -d
```

Вот и всё! Получите доступ к приложению по адресу `http://localhost:5173` и к API по адресу `http://localhost:5005`.

### Ручная Настройка

**Предварительные требования:** Node.js 18+, PostgreSQL 14+, Redis 7+

```bash
# Клонировать
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn

# Backend
cd backend
cp .env.example .env    # Отредактируйте .env с вашей конфигурацией
npm install
npm run start:dev

# Frontend (в новом терминале)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Архитектура

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

**Frontend** (`/frontend`) -- React 19, Vite, TailwindCSS, ReactFlow, i18next, CodeMirror

**Backend** (`/backend`) -- NestJS, PostgreSQL (raw SQL), Redis, Socket.IO, LangChain, более 120 коннекторов

## Коннекторы

FluxTurn поставляется с более чем 120 коннекторами в этих категориях:

| Категория | Коннекторы |
|----------|-----------|
| **ИИ и ML** | OpenAI, OpenAI Chatbot, Anthropic, Google AI, Google Gemini, AWS Bedrock |
| **Аналитика** | Google Analytics, Grafana, Metabase, Mixpanel, PostHog, Segment, Splunk |
| **CMS** | WordPress, Contentful, Ghost, Medium, Webflow |
| **Коммуникация** | Slack, Gmail, Microsoft Teams, Telegram, Discord, Twilio, WhatsApp, AWS SES, SMTP, IMAP, POP3, Google Calendar, Calendly, Discourse, Matrix, Mattermost |
| **CRM и Продажи** | HubSpot, Salesforce, Pipedrive, Zoho CRM, Airtable, Monday.com |
| **Обработка Данных** | Supabase, Scrapfly, Extract From File |
| **База Данных** | Elasticsearch |
| **Разработка** | GitHub, GitLab, Bitbucket, Git, Jenkins, Travis CI, Netlify, n8n, npm |
| **Электронная Коммерция** | Shopify, Stripe, PayPal, WooCommerce, Magento, Paddle, Gumroad |
| **Финансы** | QuickBooks, Plaid, Chargebee, Wise, Xero |
| **Формы** | Google Forms, Jotform, Typeform |
| **Маркетинг** | Mailchimp, Klaviyo, SendGrid, Brevo, ActiveCampaign, Google Ads, Facebook Ads |
| **Продуктивность** | Figma, Todoist, Spotify, Clockify, Toggl, Harvest |
| **Управление Проектами** | Jira, Asana, Trello, Notion, Linear, ClickUp |
| **Социальные Сети** | Twitter/X, Facebook, Instagram, TikTok, LinkedIn, Pinterest, Reddit |
| **Хранилище** | Google Drive, Google Docs, Google Sheets, Dropbox, AWS S3, PostgreSQL, MySQL, MongoDB, Redis, Snowflake |
| **Поддержка** | Zendesk, Intercom, Freshdesk, ServiceNow, PagerDuty, Sentry |
| **Утилиты** | Bitly, DeepL, FTP, SSH, Execute Command |
| **Видео** | YouTube, Zoom |

[Просмотреть все коннекторы &rarr;](docs/connectors.md)

## i18n

FluxTurn поддерживает 17 языков через i18next:

- Английский, Японский, Китайский, Корейский, Испанский, Французский, Немецкий, Итальянский, Русский, Португальский (BR), Голландский, Польский, Украинский, Вьетнамский, Индонезийский, Арабский, Хинди

Хотите добавить новый язык? См. [руководство по переводу](docs/contributing/translations.md).

## Вклад

Мы приветствуем вклад! См. наше [Руководство по Вкладу](CONTRIBUTING.md) для начала.

**Способы внести вклад:**
- Сообщайте об ошибках или запрашивайте функции через [GitHub Issues](https://github.com/fluxturn/fluxturn/issues)
- Отправляйте pull requests для исправления ошибок или новых функций
- Добавляйте новые коннекторы (см. [Руководство по Разработке Коннекторов](docs/guides/connector-development.md))
- Улучшайте документацию
- Добавляйте переводы

## Участники

Спасибо всем замечательным людям, которые внесли вклад в FluxTurn! 🎉

<a href="https://github.com/fluxturn/fluxturn/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn" />
</a>

Хотите увидеть своё лицо здесь? Ознакомьтесь с нашим [Руководством по Вкладу](CONTRIBUTING.md) и начните вносить вклад уже сегодня!

## Сообщество

- [Discord](https://discord.gg/tpJZ9J3q) -- Общайтесь с командой и сообществом
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions) -- Задавайте вопросы, делитесь идеями
- [Twitter/X](https://twitter.com/fluxturn) -- Следите за обновлениями

## Лицензия

Этот проект лицензирован под [Apache License 2.0](LICENSE).

## Благодарности

Создано с помощью [NestJS](https://nestjs.com), [React](https://react.dev), [ReactFlow](https://reactflow.dev), [TypeScript](https://typescriptlang.org) и [i18next](https://i18next.com).

---

<p align="center">
  <a href="https://fluxturn.com">Веб-сайт</a> |
  <a href="https://github.com/fluxturn/fluxturn/wiki">Документация</a> |
  <a href="https://discord.gg/tpJZ9J3q">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>
