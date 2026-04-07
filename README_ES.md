<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/Exploring the Future of Technology.png" alt="FluxTurn" width="600">
  </a>
</p>

<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>Plataforma de automatización de flujos de trabajo de código abierto impulsada por IA</strong>
  </p>
  <p align="center">
    Construye, automatiza y orquesta flujos de trabajo con lenguaje natural y un constructor visual.
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
  <a href="https://github.com/fluxturn/fluxturn/wiki">Documentación</a> |
  <a href="#quick-start">Inicio Rápido</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="CONTRIBUTING.md">Contribuir</a>
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

## ¿Qué es FluxTurn?

FluxTurn es una plataforma de automatización de flujos de trabajo de código abierto que te permite conectar aplicaciones, automatizar procesos y construir flujos de trabajo impulsados por IA, todo a través de un constructor visual o lenguaje natural.

**Capacidades clave:**

- **Generación de Flujos de Trabajo con IA** -- Describe lo que quieres en español sencillo, obtén un flujo de trabajo funcional
- **Constructor Visual de Flujos de Trabajo** -- Interfaz de arrastrar y soltar impulsada por ReactFlow
- **Más de 120 Conectores** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI, y muchos más
- **Ejecución en Tiempo Real** -- Observa los flujos de trabajo ejecutarse con registros detallados y monitoreo
- **Auto-alojado** -- Ejecuta en tu propia infraestructura con Docker

## Inicio Rápido

### Docker (Recomendado)

Ejecuta estos comandos desde la raíz del proyecto:

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
cp backend/.env.example backend/.env
# Edita backend/.env con tus credenciales de base de datos y secreto JWT
docker compose up -d
```

¡Eso es todo! Accede a la aplicación en `http://localhost:5173` y a la API en `http://localhost:5005`.

### Configuración Manual

**Requisitos previos:** Node.js 18+, PostgreSQL 14+, Redis 7+

```bash
# Clonar
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn

# Backend
cd backend
cp .env.example .env    # Edita .env con tu configuración
npm install
npm run start:dev

# Frontend (en una nueva terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Arquitectura

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

**Backend** (`/backend`) -- NestJS, PostgreSQL (raw SQL), Redis, Socket.IO, LangChain, más de 120 conectores

## Conectores

FluxTurn incluye más de 120 conectores en estas categorías:

| Categoría | Conectores |
|----------|-----------|
| **IA y ML** | OpenAI, OpenAI Chatbot, Anthropic, Google AI, Google Gemini, AWS Bedrock |
| **Analítica** | Google Analytics, Grafana, Metabase, Mixpanel, PostHog, Segment, Splunk |
| **CMS** | WordPress, Contentful, Ghost, Medium, Webflow |
| **Comunicación** | Slack, Gmail, Microsoft Teams, Telegram, Discord, Twilio, WhatsApp, AWS SES, SMTP, IMAP, POP3, Google Calendar, Calendly, Discourse, Matrix, Mattermost |
| **CRM y Ventas** | HubSpot, Salesforce, Pipedrive, Zoho CRM, Airtable, Monday.com |
| **Procesamiento de Datos** | Supabase, Scrapfly, Extract From File |
| **Base de Datos** | Elasticsearch |
| **Desarrollo** | GitHub, GitLab, Bitbucket, Git, Jenkins, Travis CI, Netlify, n8n, npm |
| **Comercio Electrónico** | Shopify, Stripe, PayPal, WooCommerce, Magento, Paddle, Gumroad |
| **Finanzas** | QuickBooks, Plaid, Chargebee, Wise, Xero |
| **Formularios** | Google Forms, Jotform, Typeform |
| **Marketing** | Mailchimp, Klaviyo, SendGrid, Brevo, ActiveCampaign, Google Ads, Facebook Ads |
| **Productividad** | Figma, Todoist, Spotify, Clockify, Toggl, Harvest |
| **Gestión de Proyectos** | Jira, Asana, Trello, Notion, Linear, ClickUp |
| **Redes Sociales** | Twitter/X, Facebook, Instagram, TikTok, LinkedIn, Pinterest, Reddit |
| **Almacenamiento** | Google Drive, Google Docs, Google Sheets, Dropbox, AWS S3, PostgreSQL, MySQL, MongoDB, Redis, Snowflake |
| **Soporte** | Zendesk, Intercom, Freshdesk, ServiceNow, PagerDuty, Sentry |
| **Utilidades** | Bitly, DeepL, FTP, SSH, Execute Command |
| **Video** | YouTube, Zoom |

[Ver todos los conectores &rarr;](docs/connectors.md)

## i18n

FluxTurn soporta 17 idiomas a través de i18next:

- Inglés, Japonés, Chino, Coreano, Español, Francés, Alemán, Italiano, Ruso, Portugués (BR), Holandés, Polaco, Ucraniano, Vietnamita, Indonesio, Árabe, Hindi

¿Quieres añadir un nuevo idioma? Consulta la [guía de traducción](docs/contributing/translations.md).

## Contribuir

¡Damos la bienvenida a las contribuciones! Consulta nuestra [Guía de Contribución](CONTRIBUTING.md) para comenzar.

**Formas de contribuir:**
- Reporta errores o solicita funcionalidades a través de [GitHub Issues](https://github.com/fluxturn/fluxturn/issues)
- Envía pull requests para correcciones de errores o nuevas funcionalidades
- Añade nuevos conectores (consulta la [Guía de Desarrollo de Conectores](docs/guides/connector-development.md))
- Mejora la documentación
- Añade traducciones

## Contribuidores

¡Gracias a todas las personas increíbles que han contribuido a FluxTurn! 🎉

<a href="https://github.com/fluxturn/fluxturn/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn" />
</a>

¿Quieres ver tu rostro aquí? ¡Consulta nuestra [Guía de Contribución](CONTRIBUTING.md) y comienza a contribuir hoy!

## Comunidad

- [Discord](https://discord.gg/fluxturn) -- Chatea con el equipo y la comunidad
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions) -- Haz preguntas, comparte ideas
- [Twitter/X](https://twitter.com/fluxturn) -- Síguenos para actualizaciones

## Licencia

Este proyecto está licenciado bajo la [Licencia Apache 2.0](LICENSE).

## Agradecimientos

Construido con [NestJS](https://nestjs.com), [React](https://react.dev), [ReactFlow](https://reactflow.dev), [TypeScript](https://typescriptlang.org), y [i18next](https://i18next.com).

---

<p align="center">
  <a href="https://fluxturn.com">Sitio Web</a> |
  <a href="https://github.com/fluxturn/fluxturn/wiki">Documentación</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>
