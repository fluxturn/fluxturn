<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/Exploring the Future of Technology.png" alt="FluxTurn" width="600">
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
  <a href="https://discord.gg/fluxturn"><img src="https://img.shields.io/discord/YOUR_DISCORD_ID?label=Discord&logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center">
  <a href="https://github.com/fluxturn/fluxturn/wiki">Документация</a> |
  <a href="#quick-start">Быстрый Старт</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
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

FluxTurn -- это **готовая к продакшену платформа автоматизации рабочих процессов с открытым исходным кодом**, которая устраняет разрыв между идеей и реализацией. Созданная для разработчиков, DevOps-команд и технических пользователей, FluxTurn сочетает мощь генерации рабочих процессов на базе ИИ с продвинутым визуальным конструктором, помогая вам автоматизировать сложные процессы за секунды вместо часов.

В отличие от традиционных инструментов автоматизации, требующих обширной настройки, или low-code платформ, жертвующих гибкостью, FluxTurn дает вам лучшее из обоих миров: скорость генерации рабочих процессов на естественном языке и точность визуального редактора на основе узлов.

<p align="center">
  <img src="frontend/public/fluxturn_demo.png" alt="FluxTurn Visual Workflow Builder" width="800">
  <br>
  <em>Визуальный конструктор рабочих процессов FluxTurn, показывающий рабочий процесс ИИ-агента с памятью чата</em>
</p>

### Как Это Работает

1. **Опишите Ваш Рабочий Процесс** -- Скажите FluxTurn, что вы хотите автоматизировать, на простом русском языке
2. **ИИ Генерирует Процесс** -- Наш ИИ-агент анализирует ваши требования и создает полный рабочий процесс с нужными коннекторами
3. **Визуальное Уточнение** -- Доработайте сгенерированный рабочий процесс с помощью нашего редактора на базе ReactFlow
4. **Развертывание и Мониторинг** -- Выполняйте рабочие процессы в реальном времени с подробным логированием и мониторингом через WebSocket

### Ключевые Возможности

- **🤖 Генерация Рабочих Процессов с ИИ** -- Опишите, что вы хотите, на простом русском, получите работающий процесс с правильной обработкой ошибок и лучшими практиками
- **🎨 Визуальный Конструктор Рабочих Процессов** -- Интерфейс перетаскивания на базе ReactFlow с проверкой в реальном времени
- **🔌 120+ Готовых Коннекторов** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI, Anthropic и многое другое
- **⚡ Выполнение в Реальном Времени** -- Наблюдайте за выполнением рабочих процессов с подробными логами, обновлениями через WebSocket и метриками производительности
- **🏠 Самостоятельный Хостинг и Конфиденциальность** -- Запускайте на собственной инфраструктуре с Docker, полный контроль над данными
- **🌍 Поддержка Множества Языков** -- 17 языков, включая английский, японский, китайский, корейский, испанский и другие
- **🔄 Готовность к Продакшену** -- Построено с NestJS, PostgreSQL, Redis и Qdrant для корпоративного масштаба развертывания

## Какую Проблему Мы Решаем

### Дилемма Автоматизации

Современные команды сталкиваются с критической проблемой: **автоматизация необходима, но требует много времени**. Создание интеграций между инструментами, обработка ошибок и поддержка рабочих процессов требует значительных инженерных ресурсов.

**Общие болевые точки, которые мы решаем:**

- ❌ **Ад Ручных Интеграций** -- Написание пользовательских скриптов для подключения различных API занимает часы или дни
- ❌ **Дорогая Зависимость от SaaS** -- Коммерческие инструменты автоматизации взимают плату за выполнение рабочего процесса или пользовательское место
- ❌ **Ограниченная Гибкость** -- Low-code платформы легки в начале, но сложны для настройки сложных случаев использования
- ❌ **Зависимость от Поставщика** -- Облачные решения означают, что вы не владеете своей логикой автоматизации или данными
- ❌ **Крутая Кривая Обучения** -- Традиционные движки рабочих процессов требуют глубоких технических знаний для настройки

### Решение FluxTurn

✅ **Скорость на Базе ИИ** -- Превращайте идеи в работающие процессы за секунды, а не часы
✅ **Свобода Open Source** -- Никакой зависимости от поставщика, никаких платежей за выполнение, полный контроль над вашим кодом
✅ **Конфиденциальность Самостоятельного Хостинга** -- Храните конфиденциальные данные и рабочие процессы на своей инфраструктуре
✅ **Дружелюбность к Разработчикам** -- Полный доступ к API, расширяемая система коннекторов, кодовая база на TypeScript
✅ **Визуальный + Код** -- Начните с генерации ИИ, доработайте визуально, экспортируйте как код, если нужно

## Почему FluxTurn? (Сравнение)

| Функция | FluxTurn | Zapier/Make | n8n | Temporal | Пользовательские Скрипты |
|---------|----------|-------------|-----|----------|----------------|
| **Генерация Рабочих Процессов с ИИ** | ✅ Встроенная | ❌ | ❌ | ❌ | ❌ |
| **Визуальный Конструктор** | ✅ ReactFlow | ✅ | ✅ | ❌ | ❌ |
| **Самостоятельный Хостинг** | ✅ Бесплатно | ❌ | ✅ | ✅ | ✅ |
| **Open Source** | ✅ Apache 2.0 | ❌ | ✅ Fair-code | ✅ MIT | N/A |
| **Готовые Коннекторы** | ✅ 120+ | ✅ 5000+ | ✅ 400+ | ❌ | ❌ |
| **Мониторинг в Реальном Времени** | ✅ WebSocket | ✅ | ✅ | ✅ | ❌ |
| **Многоязычный UI** | ✅ 17 языков | ✅ | ❌ | ❌ | N/A |
| **Нет Стоимости за Выполнение** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Готовность к Продакшену** | ✅ NestJS | ✅ | ✅ | ✅ | ⚠️ |
| **Ввод на Естественном Языке** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Векторный Поиск (Qdrant)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Кривая Обучения** | 🟢 Низкая | 🟢 Низкая | 🟡 Средняя | 🔴 Высокая | 🔴 Высокая |

### Что Делает FluxTurn Уникальным?

1. **Дизайн с Приоритетом ИИ** -- Единственная платформа рабочих процессов с нативной генерацией рабочих процессов ИИ и пониманием естественного языка
2. **Современный Технологический Стек** -- React 19, NestJS, PostgreSQL, Redis, Qdrant -- построено для 2025 года и далее
3. **Опыт Разработчиков** -- Чистая кодовая база на TypeScript, расширяемая архитектура, комплексный API
4. **Настоящий Open Source** -- Лицензия Apache 2.0, никаких ограничений "fair-code", разработка, управляемая сообществом
5. **Мультимодальный Ввод** -- Естественный язык ИЛИ визуальный конструктор ИЛИ API -- выбирайте то, что работает для вашей команды

## 📊 Активность Проекта и Статистика

FluxTurn — это **активно поддерживаемый** проект с растущим сообществом. Вот что происходит:

### Активность на GitHub

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

### Метрики Сообщества

| Метрика | Статус | Детали |
|--------|--------|---------|
| **Всего Контрибьюторов** | ![Contributors](https://img.shields.io/github/contributors/fluxturn/fluxturn?style=flat-square) | Растущее сообщество разработчиков |
| **Всего Коммитов** | ![Commits](https://img.shields.io/github/commit-activity/t/fluxturn/fluxturn?style=flat-square) | Непрерывная разработка |
| **Ежемесячные Коммиты** | ![Commit Activity](https://img.shields.io/github/commit-activity/m/fluxturn/fluxturn?style=flat-square) | Активная поддержка |
| **Среднее Время Проверки PR** | ~24-48 часов | Быстрая обратная связь |
| **Качество Кода** | ![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen?style=flat-square) | TypeScript, ESLint, Prettier |
| **Покрытие Тестами** | ![Coverage](https://img.shields.io/badge/coverage-85%25-green?style=flat-square) | Хорошо протестированная кодовая база |
| **Документация** | ![Docs](https://img.shields.io/badge/docs-comprehensive-blue?style=flat-square) | Обширные руководства и документация API |

### Статистика по Языкам и Коду

<p align="left">
  <img src="https://img.shields.io/github/languages/top/fluxturn/fluxturn?style=for-the-badge&logo=typescript&color=blue" alt="Top Language">
  <img src="https://img.shields.io/github/languages/count/fluxturn/fluxturn?style=for-the-badge&color=purple" alt="Language Count">
  <img src="https://img.shields.io/github/repo-size/fluxturn/fluxturn?style=for-the-badge&color=orange" alt="Repo Size">
  <img src="https://img.shields.io/github/license/fluxturn/fluxturn?style=for-the-badge&color=green" alt="License">
</p>

### Основные Моменты Недавней Активности

- ✅ **120+ Коннекторов** выпущено и протестировано
- ✅ **17 Языков** поддерживается в UI
- ✅ **1000+ Коммитов** и продолжается
- ✅ **Активный Discord** сообщество с поддержкой в реальном времени
- ✅ **Еженедельные Релизы** с новыми функциями и исправлениями ошибок
- ✅ **Отзывчивые Мейнтейнеры** -- PR проверяются в течение 1-2 дней

### Почему Эти Цифры Важны

**Быстрая Проверка PR** -- Мы ценим ваше время. Большинство pull request получают первоначальную обратную связь в течение 24-48 часов, а не недель.

**Активная Разработка** -- Регулярные коммиты означают, что проект развивается. Новые функции, исправления ошибок и улучшения выпускаются непрерывно.

**Растущие Контрибьюторы** -- Больше контрибьюторов = больше перспектив, лучшее качество кода и более быстрая разработка функций.

**Высокое Покрытие Тестами** -- 85%+ покрытия означает, что вы можете вносить вклад с уверенностью, зная, что тесты обнаружат регрессии.

**Полная Документация** -- Подробная документация означает меньше времени на борьбу, больше времени на создание.

### Присоединяйтесь к Активности!

Хотите увидеть свой вклад здесь? Ознакомьтесь с нашим [Кратким Руководством по Внесению Вклада](#-краткое-руководство-по-внесению-вклада) ниже!

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

Вот и всё! Получите доступ к приложению по адресу `http://localhost:5185` и к API по адресу `http://localhost:5005`.

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

## 🚀 Почему Вносить Вклад в FluxTurn?

FluxTurn -- это больше, чем просто очередной open-source проект -- это возможность работать с передовыми технологиями, создавая что-то, что решает реальные проблемы разработчиков по всему миру.

### Что Вы Получите

**📚 Изучите Современный Технологический Стек**
- **React 19** -- Последние возможности React, включая Server Components
- **NestJS** -- Профессиональный backend-фреймворк, используемый крупными компаниями
- **LangChain** -- Интеграция ИИ/ML и оркестрация агентов
- **Векторные Базы Данных** -- Работа с Qdrant для семантического поиска
- **ReactFlow** -- Создание интерактивных UI на основе узлов
- **Системы Реального Времени** -- WebSocket, Redis и событийно-ориентированная архитектура

**💼 Создайте Свое Портфолио**
- Вносите вклад в **готовую к продакшену** платформу, используемую реальными компаниями
- Работайте над функциями, которые появляются в вашем профиле GitHub
- Получите признание в нашем зале славы контрибьюторов
- Развивайте экспертизу в **автоматизации рабочих процессов** и **интеграции ИИ** -- высоко ценимые навыки в 2026 году

**🤝 Присоединитесь к Растущему Сообществу**
- Общайтесь с разработчиками со всего мира
- Получайте код-ревью от опытных мейнтейнеров
- Изучайте лучшие практики в архитектуре программного обеспечения
- Участвуйте в технических обсуждениях и проектных решениях

**🎯 Создавайте Реальное Влияние**
- Ваш код поможет тысячам разработчиков автоматизировать их рабочие процессы
- Видите, как ваши функции используются в продакшен-средах
- Влияйте на направление платформы автоматизации на базе ИИ

**⚡ Быстрое Начало Работы**
- Настройка на базе Docker позволяет запуститься **менее чем за 5 минут**
- Хорошо документированная кодовая база с понятной архитектурой
- Дружелюбные мейнтейнеры, которые отвечают на PR в течение 24-48 часов
- Метки "good first issue" для новичков

## 🗺️ Дорожная Карта Проекта

Вот что мы строим и где вы можете внести свой вклад. Элементы, отмеченные 🆘, нуждаются в помощи!

### Q2 2026 (Текущий Квартал)

**🤖 ИИ и Интеллект**
- [ ] 🆘 **Оптимизация Рабочих Процессов с ИИ** -- Автоматическое предложение улучшений производительности для рабочих процессов
- [ ] **Многоагентные Рабочие Процессы** -- Поддержка параллельных ИИ-агентов с координацией
- [ ] 🆘 **Редактирование Рабочих Процессов на Естественном Языке** -- "Добавить обработку ошибок в шаг 3" обновляет рабочий процесс
- [ ] **Умные Предложения Коннекторов** -- ИИ рекомендует коннекторы на основе контекста рабочего процесса

**🔌 Коннекторы и Интеграции**
- [ ] 🆘 **50+ Новых Коннекторов** -- Notion, Linear, Airtable, Make.com и т.д.
- [ ] **Маркетплейс Коннекторов** -- Коннекторы, созданные сообществом
- [ ] 🆘 **Поддержка GraphQL** -- Добавление коннектора GraphQL для современных API
- [ ] **Коннекторы Баз Данных** -- Улучшения Supabase, PlanetScale, Neon

**🎨 Улучшения Визуального Конструктора**
- [ ] 🆘 **Шаблоны Рабочих Процессов** -- Готовые шаблоны для общих случаев использования
- [ ] **UI Условного Ветвления** -- Визуальный конструктор if/else-потоков
- [ ] 🆘 **Версионирование Рабочих Процессов** -- Отслеживание и откат изменений рабочего процесса
- [ ] **Совместное Редактирование** -- Несколько пользователей редактируют один рабочий процесс

### Q3 2026

**⚡ Производительность и Масштабирование**
- [ ] **Распределенное Выполнение** -- Запуск рабочих процессов на нескольких воркерах
- [ ] 🆘 **Кэширование Рабочих Процессов** -- Кэширование дорогих операций
- [ ] **Ограничение Скорости на Коннектор** -- Автоматическая задержка и повтор
- [ ] **Горизонтальное Масштабирование** -- Поддержка нескольких экземпляров с Redis pub/sub

**🔐 Корпоративные Функции**
- [ ] **RBAC (Управление Доступом на Основе Ролей)** -- Разрешения пользователей и команды
- [ ] 🆘 **Журналы Аудита** -- Отслеживание всех изменений и выполнений рабочих процессов
- [ ] **Интеграция SSO** -- Поддержка SAML, OAuth2, LDAP
- [ ] **Управление Секретами** -- Интеграция HashiCorp Vault

**📊 Мониторинг и Наблюдаемость**
- [ ] 🆘 **Панель Метрик** -- Время выполнения, процент успеха, отслеживание ошибок
- [ ] **Интеграция OpenTelemetry** -- Экспорт трассировок в Jaeger, Datadog и т.д.
- [ ] **Система Оповещений** -- Уведомление о сбоях рабочих процессов
- [ ] 🆘 **Аналитика Рабочих Процессов** -- Паттерны использования и рекомендации по оптимизации

### Q4 2026 и Далее

**🌐 Расширение Платформы**
- [ ] **CLI Инструмент** -- Управление рабочими процессами из терминала
- [ ] 🆘 **Рабочий Процесс как Код** -- Определение рабочих процессов в YAML/JSON
- [ ] **Интеграция CI/CD** -- Коннекторы GitHub Actions, GitLab CI
- [ ] **Мобильное Приложение** -- Мониторинг рабочих процессов для iOS/Android

**🧩 Опыт Разработчиков**
- [ ] 🆘 **Система Плагинов** -- Пользовательские узлы и коннекторы через плагины
- [ ] **Фреймворк Тестирования Рабочих Процессов** -- Модульные тесты для рабочих процессов
- [ ] **Режим Локальной Разработки** -- Офлайн-разработка рабочих процессов
- [ ] **Валидация Схемы API** -- Автоматическая валидация ответов коннекторов

### Как Повлиять на Дорожную Карту

💡 **Есть идеи?** Откройте [GitHub Discussion](https://github.com/fluxturn/fluxturn/discussions) или присоединитесь к нашему [Discord](https://discord.gg/fluxturn)

🗳️ **Голосуйте за функции** -- Отмечайте звездочкой issues, которые вам важны, чтобы помочь нам расставить приоритеты

🛠️ **Хотите создать что-то, что не указано?** -- Предложите это! Мы любим функции, управляемые сообществом

## 🎯 Краткое Руководство по Внесению Вклада

Начните вносить вклад **менее чем за 10 минут**:

### Шаг 1: Настройте Свое Окружение

```bash
# Сделайте форк репозитория на GitHub, затем клонируйте свой форк
git clone https://github.com/YOUR_USERNAME/fluxturn.git
cd fluxturn

# Начните с Docker (самый простой способ)
cp backend/.env.example backend/.env
docker compose up -d

# Доступ к приложению
# Frontend: http://localhost:5185
# Backend API: http://localhost:5005
```

**Вот и всё!** Вы запустили FluxTurn локально.

### Шаг 2: Найдите, Над Чем Работать

Выберите в зависимости от уровня вашего опыта:

**🟢 Для Начинающих**
- 📝 [Исправьте опечатки или улучшите документацию](https://github.com/fluxturn/fluxturn/labels/documentation)
- 🌍 [Добавьте переводы](https://github.com/fluxturn/fluxturn/labels/i18n) -- Мы поддерживаем 17 языков
- 🐛 [Исправьте простые баги](https://github.com/fluxturn/fluxturn/labels/good%20first%20issue)
- ✨ [Улучшите UI/UX](https://github.com/fluxturn/fluxturn/labels/ui%2Fux)

**🟡 Средний Уровень**
- 🔌 [Добавьте новый коннектор](https://github.com/fluxturn/fluxturn/labels/connector) -- См. наше [Руководство по Разработке Коннекторов](docs/guides/connector-development.md)
- 🎨 [Улучшите визуальный конструктор](https://github.com/fluxturn/fluxturn/labels/visual-builder)
- 🧪 [Напишите тесты](https://github.com/fluxturn/fluxturn/labels/tests)
- 🚀 [Улучшения производительности](https://github.com/fluxturn/fluxturn/labels/performance)

**🔴 Продвинутый Уровень**
- 🤖 [Функции ИИ/ML](https://github.com/fluxturn/fluxturn/labels/ai)
- ⚙️ [Улучшения основного движка](https://github.com/fluxturn/fluxturn/labels/core)
- 🏗️ [Улучшения архитектуры](https://github.com/fluxturn/fluxturn/labels/architecture)
- 🔐 [Функции безопасности](https://github.com/fluxturn/fluxturn/labels/security)

### Шаг 3: Внесите Свои Изменения

```bash
# Создайте новую ветку
git checkout -b feature/your-feature-name

# Внесите свои изменения
# - Код Frontend: /frontend/src
# - Код Backend: /backend/src
# - Коннекторы: /backend/src/modules/fluxturn/connectors

# Протестируйте свои изменения
npm run test

# Закоммитьте с понятным сообщением
git commit -m "feat: add new connector for Notion API"
```

### Шаг 4: Отправьте Свой Pull Request

```bash
# Отправьте в свой форк
git push origin feature/your-feature-name

# Откройте PR на GitHub
# - Опишите, что вы изменили и почему
# - Дайте ссылку на связанные issues
# - Добавьте скриншоты, если это изменение UI
```

**Что происходит дальше?**
- ✅ Автоматические тесты запускаются на вашем PR
- 👀 Мейнтейнер проверяет ваш код (обычно в течение 24-48 часов)
- 💬 Мы можем предложить изменения или улучшения
- 🎉 После одобрения ваш код будет слит!

### Советы по Внесению Вклада

✨ **Начните с малого** -- Ваш первый PR не должен быть огромной функцией
📖 **Читайте код** -- Просмотрите существующие коннекторы или компоненты для примеров
❓ **Задавайте вопросы** -- Присоединяйтесь к нашему [Discord](https://discord.gg/fluxturn), если застряли
🧪 **Пишите тесты** -- PR с тестами сливаются быстрее
📝 **Документируйте свой код** -- Добавляйте комментарии для сложной логики

### Нужна Помощь?

- 💬 [Discord](https://discord.gg/fluxturn) -- Общайтесь с мейнтейнерами и контрибьюторами
- 📖 [Руководство по Вкладу](CONTRIBUTING.md) -- Подробные рекомендации по внесению вклада
- 🐛 [GitHub Issues](https://github.com/fluxturn/fluxturn/issues) -- Сообщайте об ошибках или запрашивайте функции
- 💡 [Discussions](https://github.com/fluxturn/fluxturn/discussions) -- Задавайте вопросы, делитесь идеями

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
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn&anon=1&max=100&columns=10" />
</a>

Хотите увидеть своё лицо здесь? Ознакомьтесь с нашим [Руководством по Вкладу](CONTRIBUTING.md) и начните вносить вклад уже сегодня!

## 💬 Присоединяйтесь к Нашему Сообществу

Общайтесь с разработчиками, получайте помощь и будьте в курсе последних разработок FluxTurn!

<p align="center">
  <a href="https://discord.gg/fluxturn">
    <img src="https://img.shields.io/badge/Discord-Join%20Our%20Server-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord">
  </a>
  <a href="https://github.com/fluxturn/fluxturn/discussions">
    <img src="https://img.shields.io/badge/GitHub-Discussions-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Discussions">
  </a>
  <a href="https://twitter.com/fluxturn">
    <img src="https://img.shields.io/badge/Twitter-Follow%20Us-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter">
  </a>
</p>

### Где Нас Найти

| Платформа | Назначение | Ссылка |
|----------|---------|------|
| 💬 **Discord** | Чат в реальном времени, получение помощи, обсуждение функций | [Присоединиться к Серверу](https://discord.gg/fluxturn) |
| 💡 **GitHub Discussions** | Задавать вопросы, делиться идеями, запрашивать функции | [Начать Обсуждение](https://github.com/fluxturn/fluxturn/discussions) |
| 🐦 **Twitter/X** | Обновления продукта, объявления, советы | [@fluxturn](https://twitter.com/fluxturn) |
| 📧 **Email** | Прямой контакт с мейнтейнерами | hello@fluxturn.com |
| 🌐 **Website** | Документация, руководства, блог | [fluxturn.com](https://fluxturn.com) |

### Правила Сообщества

- 🤝 **Будьте Уважительны** -- Относитесь ко всем с уважением и добротой
- 💡 **Делитесь Знаниями** -- Помогайте другим учиться и расти
- 🐛 **Сообщайте о Проблемах** -- Нашли баг? Сообщите нам в GitHub Issues
- 🎉 **Празднуйте Победы** -- Делитесь своими рабочими процессами и историями успеха
- 🌍 **Думайте Глобально** -- Мы международное сообщество с более чем 17 языками

## Лицензия

Этот проект лицензирован под [Apache License 2.0](LICENSE).

## Благодарности

Создано с помощью [NestJS](https://nestjs.com), [React](https://react.dev), [ReactFlow](https://reactflow.dev), [TypeScript](https://typescriptlang.org) и [i18next](https://i18next.com).

---

<p align="center">
  <a href="https://fluxturn.com">Веб-сайт</a> |
  <a href="https://github.com/fluxturn/fluxturn/wiki">Документация</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>

---

<p align="center">
  <strong>Создано с ❤️ сообществом <a href="https://fluxturn.com">fluxturn</a> </strong>
</p>

<p align="center">
  Если вы находите этот проект полезным, рассмотрите возможность поставить звезду! ⭐
  <br><br>
  <a href="https://github.com/fluxturn/fluxturn/stargazers">
    <img src="https://img.shields.io/github/stars/fluxturn/fluxturn?style=social" alt="Star on GitHub">
  </a>
</p>
