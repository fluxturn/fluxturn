<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>Open-Source KI-gestützte Workflow-Automatisierungsplattform</strong>
  </p>
  <p align="center">
    Erstellen, automatisieren und orchestrieren Sie Workflows mit natürlicher Sprache und einem visuellen Builder.
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
  <a href="https://docs.fluxturn.com">Dokumentation</a> |
  <a href="#quick-start">Schnellstart</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="CONTRIBUTING.md">Mitwirken</a>
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

## Was ist FluxTurn?

FluxTurn ist eine Open-Source-Workflow-Automatisierungsplattform, mit der Sie Apps verbinden, Prozesse automatisieren und KI-gestützte Workflows erstellen können -- alles über einen visuellen Builder oder natürliche Sprache.

**Hauptfunktionen:**

- **KI-Workflow-Generierung** -- Beschreiben Sie auf einfachem Deutsch, was Sie wollen, erhalten Sie einen funktionierenden Workflow
- **Visueller Workflow-Builder** -- Drag-and-Drop-Oberfläche powered by ReactFlow
- **Über 80 Konnektoren** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI und viele mehr
- **Echtzeit-Ausführung** -- Beobachten Sie Workflows mit detaillierten Logs und Monitoring
- **Selbst gehostet** -- Betreiben Sie auf Ihrer eigenen Infrastruktur mit Docker

## Schnellstart

### Docker (Empfohlen)

Führen Sie diese Befehle im Projektstamm aus:

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
cp backend/.env.example backend/.env
# Bearbeiten Sie backend/.env mit Ihren Datenbank-Zugangsdaten und JWT-Secret
docker compose up -d
```

Das war's! Greifen Sie auf die App unter `http://localhost:5173` und auf die API unter `http://localhost:5005` zu.

### Manuelle Einrichtung

**Voraussetzungen:** Node.js 18+, PostgreSQL 14+, Redis 7+

```bash
# Klonen
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn

# Backend
cd backend
cp .env.example .env    # Bearbeiten Sie .env mit Ihrer Konfiguration
npm install
npm run start:dev

# Frontend (in einem neuen Terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Architektur

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

**Backend** (`/backend`) -- NestJS, PostgreSQL (raw SQL), Redis, Socket.IO, LangChain, über 80 Konnektoren

## Konnektoren

FluxTurn wird mit über 80 Konnektoren in diesen Kategorien geliefert:

| Kategorie | Konnektoren |
|----------|-----------|
| **Kommunikation** | Slack, Gmail, Outlook, Telegram, Discord, Twilio, SendGrid, Microsoft Teams |
| **CRM & Vertrieb** | HubSpot, Salesforce, Pipedrive, Zoho CRM, Airtable |
| **E-Commerce** | Shopify, Stripe, PayPal, WooCommerce, Paddle, Gumroad |
| **Projektmanagement** | Jira, Asana, Trello, Notion, Linear, ClickUp |
| **Soziale Medien** | Twitter/X, Facebook, Instagram, TikTok, LinkedIn, Pinterest |
| **KI & ML** | OpenAI, Anthropic, Google AI, AWS Bedrock, Ollama, Replicate |
| **Analytik** | PostHog, Mixpanel, Segment, Grafana, Metabase, Splunk |
| **Speicher** | Google Drive, Dropbox, AWS S3, PostgreSQL, Snowflake, Supabase |
| **Support** | Zendesk, Intercom, ServiceNow, PagerDuty, Sentry |
| **Finanzen** | QuickBooks, Plaid, Chargebee, Wise |
| **Marketing** | Mailchimp, Klaviyo, Facebook Ads |
| **CMS** | WordPress, Contentful, Ghost, Medium, Webflow |

[Alle Konnektoren anzeigen &rarr;](docs/connectors.md)

## i18n

FluxTurn unterstützt 17 Sprachen über i18next:

- Englisch, Japanisch, Chinesisch, Koreanisch, Spanisch, Französisch, Deutsch, Italienisch, Russisch, Portugiesisch (BR), Niederländisch, Polnisch, Ukrainisch, Vietnamesisch, Indonesisch, Arabisch, Hindi

Möchten Sie eine neue Sprache hinzufügen? Siehe [Übersetzungsleitfaden](docs/contributing/translations.md).

## Mitwirken

Wir begrüßen Beiträge! Siehe unseren [Beitragsleitfaden](CONTRIBUTING.md) zum Einstieg.

**Möglichkeiten zur Mitarbeit:**
- Melden Sie Fehler oder fordern Sie Funktionen über [GitHub Issues](https://github.com/fluxturn/fluxturn/issues) an
- Reichen Sie Pull Requests für Fehlerbehebungen oder neue Funktionen ein
- Fügen Sie neue Konnektoren hinzu (siehe [Konnektor-Entwicklungsleitfaden](docs/guides/connector-development.md))
- Verbessern Sie die Dokumentation
- Fügen Sie Übersetzungen hinzu

## Mitwirkende

Vielen Dank an all die großartigen Menschen, die zu FluxTurn beigetragen haben! 🎉

<a href="https://github.com/fluxturn/fluxturn/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn" />
</a>

Möchten Sie Ihr Gesicht hier sehen? Schauen Sie sich unseren [Beitragsleitfaden](CONTRIBUTING.md) an und beginnen Sie noch heute beizutragen!

## Community

- [Discord](https://discord.gg/fluxturn) -- Chatten Sie mit dem Team und der Community
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions) -- Stellen Sie Fragen, teilen Sie Ideen
- [Twitter/X](https://twitter.com/fluxturn) -- Folgen Sie uns für Updates

## Lizenz

Dieses Projekt ist unter der [Apache License 2.0](LICENSE) lizenziert.

## Danksagungen

Erstellt mit [NestJS](https://nestjs.com), [React](https://react.dev), [ReactFlow](https://reactflow.dev), [TypeScript](https://typescriptlang.org) und [i18next](https://i18next.com).

---

<p align="center">
  <a href="https://fluxturn.com">Website</a> |
  <a href="https://docs.fluxturn.com">Dokumentation</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>
