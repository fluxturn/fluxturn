<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/fluxturn_1.png" alt="FluxTurn" width="600">
  </a>
</p>

<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>Plateforme d'automatisation de workflows open-source alimentée par l'IA</strong>
  </p>
  <p align="center">
    Créez, automatisez et orchestrez des workflows avec le langage naturel et un constructeur visuel.
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
  <a href="https://github.com/fluxturn/fluxturn/wiki">Documentation</a> |
  <a href="#quick-start">Démarrage Rapide</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="CONTRIBUTING.md">Contribuer</a>
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

## Qu'est-ce que FluxTurn ?

FluxTurn est une plateforme d'automatisation de workflows open-source qui vous permet de connecter des applications, d'automatiser des processus et de créer des workflows alimentés par l'IA -- le tout via un constructeur visuel ou le langage naturel.

**Capacités principales :**

- **Génération de Workflows par IA** -- Décrivez ce que vous voulez en français simple, obtenez un workflow fonctionnel
- **Constructeur Visuel de Workflows** -- Interface glisser-déposer alimentée par ReactFlow
- **Plus de 80 Connecteurs** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI, et bien plus
- **Exécution en Temps Réel** -- Regardez les workflows s'exécuter avec des journaux détaillés et une surveillance
- **Auto-hébergé** -- Exécutez sur votre propre infrastructure avec Docker

## Démarrage Rapide

### Docker (Recommandé)

Exécutez ces commandes depuis la racine du projet :

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
cp backend/.env.example backend/.env
# Modifiez backend/.env avec vos identifiants de base de données et secret JWT
docker compose up -d
```

C'est tout ! Accédez à l'application sur `http://localhost:5173` et à l'API sur `http://localhost:5005`.

### Configuration Manuelle

**Prérequis :** Node.js 18+, PostgreSQL 14+, Redis 7+

```bash
# Cloner
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn

# Backend
cd backend
cp .env.example .env    # Modifiez .env avec votre configuration
npm install
npm run start:dev

# Frontend (dans un nouveau terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Architecture

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

**Backend** (`/backend`) -- NestJS, PostgreSQL (raw SQL), Redis, Socket.IO, LangChain, plus de 80 connecteurs

## Connecteurs

FluxTurn est livré avec plus de 80 connecteurs dans ces catégories :

| Catégorie | Connecteurs |
|----------|-----------|
| **Communication** | Slack, Gmail, Outlook, Telegram, Discord, Twilio, SendGrid, Microsoft Teams |
| **CRM et Ventes** | HubSpot, Salesforce, Pipedrive, Zoho CRM, Airtable |
| **E-Commerce** | Shopify, Stripe, PayPal, WooCommerce, Paddle, Gumroad |
| **Gestion de Projet** | Jira, Asana, Trello, Notion, Linear, ClickUp |
| **Réseaux Sociaux** | Twitter/X, Facebook, Instagram, TikTok, LinkedIn, Pinterest |
| **IA et ML** | OpenAI, Anthropic, Google AI, AWS Bedrock, Ollama, Replicate |
| **Analytique** | PostHog, Mixpanel, Segment, Grafana, Metabase, Splunk |
| **Stockage** | Google Drive, Dropbox, AWS S3, PostgreSQL, Snowflake, Supabase |
| **Support** | Zendesk, Intercom, ServiceNow, PagerDuty, Sentry |
| **Finance** | QuickBooks, Plaid, Chargebee, Wise |
| **Marketing** | Mailchimp, Klaviyo, Facebook Ads |
| **CMS** | WordPress, Contentful, Ghost, Medium, Webflow |

[Voir tous les connecteurs &rarr;](docs/connectors.md)

## i18n

FluxTurn supporte 17 langues via i18next :

- Anglais, Japonais, Chinois, Coréen, Espagnol, Français, Allemand, Italien, Russe, Portugais (BR), Néerlandais, Polonais, Ukrainien, Vietnamien, Indonésien, Arabe, Hindi

Vous voulez ajouter une nouvelle langue ? Consultez le [guide de traduction](docs/contributing/translations.md).

## Contribuer

Nous accueillons les contributions ! Consultez notre [Guide de Contribution](CONTRIBUTING.md) pour commencer.

**Façons de contribuer :**
- Signalez des bugs ou demandez des fonctionnalités via [GitHub Issues](https://github.com/fluxturn/fluxturn/issues)
- Soumettez des pull requests pour des corrections de bugs ou de nouvelles fonctionnalités
- Ajoutez de nouveaux connecteurs (voir le [Guide de Développement de Connecteurs](docs/guides/connector-development.md))
- Améliorez la documentation
- Ajoutez des traductions

## Contributeurs

Merci à toutes les personnes formidables qui ont contribué à FluxTurn ! 🎉

<a href="https://github.com/fluxturn/fluxturn/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn" />
</a>

Vous voulez voir votre visage ici ? Consultez notre [Guide de Contribution](CONTRIBUTING.md) et commencez à contribuer dès aujourd'hui !

## Communauté

- [Discord](https://discord.gg/fluxturn) -- Discutez avec l'équipe et la communauté
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions) -- Posez des questions, partagez des idées
- [Twitter/X](https://twitter.com/fluxturn) -- Suivez-nous pour les mises à jour

## Licence

Ce projet est sous licence [Apache License 2.0](LICENSE).

## Remerciements

Construit avec [NestJS](https://nestjs.com), [React](https://react.dev), [ReactFlow](https://reactflow.dev), [TypeScript](https://typescriptlang.org), et [i18next](https://i18next.com).

---

<p align="center">
  <a href="https://fluxturn.com">Site Web</a> |
  <a href="https://github.com/fluxturn/fluxturn/wiki">Documentation</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>
