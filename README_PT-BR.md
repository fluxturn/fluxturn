<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/fluxturn_1.png" alt="FluxTurn" width="600">
  </a>
</p>

<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>Plataforma de automação de fluxos de trabalho de código aberto alimentada por IA</strong>
  </p>
  <p align="center">
    Construa, automatize e orquestre fluxos de trabalho com linguagem natural e um construtor visual.
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
  <a href="https://github.com/fluxturn/fluxturn/wiki">Documentação</a> |
  <a href="#quick-start">Início Rápido</a> |
  <a href="https://discord.gg/tpJZ9J3q">Discord</a> |
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

## O que é o FluxTurn?

FluxTurn é uma plataforma de automação de fluxos de trabalho de código aberto que permite conectar aplicativos, automatizar processos e construir fluxos de trabalho alimentados por IA -- tudo através de um construtor visual ou linguagem natural.

**Capacidades principais:**

- **Geração de Fluxos de Trabalho por IA** -- Descreva o que você quer em português simples, obtenha um fluxo de trabalho funcional
- **Construtor Visual de Fluxos de Trabalho** -- Interface de arrastar e soltar alimentada por ReactFlow
- **Mais de 120 Conectores** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI e muitos mais
- **Execução em Tempo Real** -- Assista os fluxos de trabalho em execução com logs detalhados e monitoramento
- **Auto-hospedado** -- Execute em sua própria infraestrutura com Docker

## Início Rápido

### Docker (Recomendado)

Execute estes comandos a partir da raiz do projeto:

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
cp backend/.env.example backend/.env
# Edite backend/.env com suas credenciais de banco de dados e segredo JWT
docker compose up -d
```

É isso! Acesse o aplicativo em `http://localhost:5173` e a API em `http://localhost:5005`.

### Configuração Manual

**Pré-requisitos:** Node.js 18+, PostgreSQL 14+, Redis 7+

```bash
# Clonar
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn

# Backend
cd backend
cp .env.example .env    # Edite .env com sua configuração
npm install
npm run start:dev

# Frontend (em um novo terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Arquitetura

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

**Backend** (`/backend`) -- NestJS, PostgreSQL (raw SQL), Redis, Socket.IO, LangChain, mais de 120 conectores

## Conectores

FluxTurn vem com mais de 120 conectores nestas categorias:

| Categoria | Conectores |
|----------|-----------|
| **IA e ML** | OpenAI, OpenAI Chatbot, Anthropic, Google AI, Google Gemini, AWS Bedrock |
| **Análise** | Google Analytics, Grafana, Metabase, Mixpanel, PostHog, Segment, Splunk |
| **CMS** | WordPress, Contentful, Ghost, Medium, Webflow |
| **Comunicação** | Slack, Gmail, Microsoft Teams, Telegram, Discord, Twilio, WhatsApp, AWS SES, SMTP, IMAP, POP3, Google Calendar, Calendly, Discourse, Matrix, Mattermost |
| **CRM e Vendas** | HubSpot, Salesforce, Pipedrive, Zoho CRM, Airtable, Monday.com |
| **Processamento de Dados** | Supabase, Scrapfly, Extract From File |
| **Banco de Dados** | Elasticsearch |
| **Desenvolvimento** | GitHub, GitLab, Bitbucket, Git, Jenkins, Travis CI, Netlify, n8n, npm |
| **E-Commerce** | Shopify, Stripe, PayPal, WooCommerce, Magento, Paddle, Gumroad |
| **Finanças** | QuickBooks, Plaid, Chargebee, Wise, Xero |
| **Formulários** | Google Forms, Jotform, Typeform |
| **Marketing** | Mailchimp, Klaviyo, SendGrid, Brevo, ActiveCampaign, Google Ads, Facebook Ads |
| **Produtividade** | Figma, Todoist, Spotify, Clockify, Toggl, Harvest |
| **Gestão de Projetos** | Jira, Asana, Trello, Notion, Linear, ClickUp |
| **Redes Sociais** | Twitter/X, Facebook, Instagram, TikTok, LinkedIn, Pinterest, Reddit |
| **Armazenamento** | Google Drive, Google Docs, Google Sheets, Dropbox, AWS S3, PostgreSQL, MySQL, MongoDB, Redis, Snowflake |
| **Suporte** | Zendesk, Intercom, Freshdesk, ServiceNow, PagerDuty, Sentry |
| **Utilitários** | Bitly, DeepL, FTP, SSH, Execute Command |
| **Vídeo** | YouTube, Zoom |

[Ver todos os conectores &rarr;](docs/connectors.md)

## i18n

FluxTurn suporta 17 idiomas via i18next:

- Inglês, Japonês, Chinês, Coreano, Espanhol, Francês, Alemão, Italiano, Russo, Português (BR), Holandês, Polonês, Ucraniano, Vietnamita, Indonésio, Árabe, Hindi

Quer adicionar um novo idioma? Veja o [guia de tradução](docs/contributing/translations.md).

## Contribuindo

Damos as boas-vindas a contribuições! Veja nosso [Guia de Contribuição](CONTRIBUTING.md) para começar.

**Formas de contribuir:**
- Relate bugs ou solicite recursos via [GitHub Issues](https://github.com/fluxturn/fluxturn/issues)
- Envie pull requests para correções de bugs ou novos recursos
- Adicione novos conectores (veja o [Guia de Desenvolvimento de Conectores](docs/guides/connector-development.md))
- Melhore a documentação
- Adicione traduções

## Contribuidores

Obrigado a todas as pessoas incríveis que contribuíram para o FluxTurn! 🎉

<a href="https://github.com/fluxturn/fluxturn/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn" />
</a>

Quer ver seu rosto aqui? Confira nosso [Guia de Contribuição](CONTRIBUTING.md) e comece a contribuir hoje!

## Comunidade

- [Discord](https://discord.gg/tpJZ9J3q) -- Converse com a equipe e a comunidade
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions) -- Faça perguntas, compartilhe ideias
- [Twitter/X](https://twitter.com/fluxturn) -- Siga-nos para atualizações

## Licença

Este projeto está licenciado sob a [Licença Apache 2.0](LICENSE).

## Agradecimentos

Construído com [NestJS](https://nestjs.com), [React](https://react.dev), [ReactFlow](https://reactflow.dev), [TypeScript](https://typescriptlang.org) e [i18next](https://i18next.com).

---

<p align="center">
  <a href="https://fluxturn.com">Site</a> |
  <a href="https://github.com/fluxturn/fluxturn/wiki">Documentação</a> |
  <a href="https://discord.gg/tpJZ9J3q">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>
