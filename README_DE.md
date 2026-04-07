<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/Exploring the Future of Technology.png" alt="FluxTurn" width="600">
  </a>
</p>

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
  <a href="https://github.com/fluxturn/fluxturn/wiki">Dokumentation</a> |
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

FluxTurn ist eine **produktionsreife, quelloffene Workflow-Automatisierungsplattform**, die die Lücke zwischen Idee und Umsetzung schließt. Entwickelt für Entwickler, DevOps-Teams und technische Benutzer, kombiniert FluxTurn die Kraft der KI-gesteuerten Workflow-Generierung mit einem ausgefeilten visuellen Builder, um Ihnen zu helfen, komplexe Prozesse in Sekunden statt Stunden zu automatisieren.

Im Gegensatz zu traditionellen Automatisierungstools, die umfangreiche Konfiguration erfordern, oder Low-Code-Plattformen, die Flexibilität opfern, bietet FluxTurn Ihnen das Beste aus beiden Welten: die Geschwindigkeit der natürlichsprachlichen Workflow-Generierung und die Präzision eines visuellen knotenbasierten Editors.

<p align="center">
  <img src="frontend/public/fluxturn_demo.png" alt="FluxTurn Visual Workflow Builder" width="800">
  <br>
  <em>FluxTurns visueller Workflow-Builder zeigt einen KI-Agenten-Workflow mit Chat-Speicher</em>
</p>

### Wie es funktioniert

1. **Beschreiben Sie Ihren Workflow** -- Sagen Sie FluxTurn in einfachem Deutsch, was Sie automatisieren möchten
2. **KI generiert den Flow** -- Unser KI-Agent analysiert Ihre Anforderungen und erstellt einen vollständigen Workflow mit den richtigen Konnektoren
3. **Visuelle Verfeinerung** -- Optimieren Sie den generierten Workflow mit unserem ReactFlow-basierten Canvas
4. **Bereitstellen & Überwachen** -- Führen Sie Workflows in Echtzeit mit detaillierter Protokollierung und WebSocket-basiertem Monitoring aus

### Hauptfunktionen

- **🤖 KI-Workflow-Generierung** -- Beschreiben Sie auf einfachem Deutsch, was Sie wollen, erhalten Sie einen funktionierenden Workflow mit ordnungsgemäßer Fehlerbehandlung und Best Practices
- **🎨 Visueller Workflow-Builder** -- Drag-and-Drop-Oberfläche powered by ReactFlow mit Echtzeit-Validierung
- **🔌 120+ Vorgefertigte Konnektoren** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI, Anthropic und viele mehr
- **⚡ Echtzeit-Ausführung** -- Beobachten Sie Workflows mit detaillierten Logs, WebSocket-Updates und Leistungsmetriken
- **🏠 Selbst gehostet & Datenschutz-orientiert** -- Betreiben Sie auf Ihrer eigenen Infrastruktur mit Docker, volle Datenkontrolle
- **🌍 Mehrsprachige Unterstützung** -- 17 Sprachen einschließlich Englisch, Japanisch, Chinesisch, Koreanisch, Spanisch und mehr
- **🔄 Produktionsreif** -- Erstellt mit NestJS, PostgreSQL, Redis und Qdrant für Unternehmens-Deployments

## Welches Problem wir lösen

### Das Automatisierungs-Dilemma

Moderne Teams stehen vor einer kritischen Herausforderung: **Automatisierung ist essentiell, aber zeitaufwändig**. Der Aufbau von Integrationen zwischen Tools, die Handhabung von Fehlern und die Wartung von Workflows erfordern erhebliche Engineering-Ressourcen.

**Häufige Schmerzpunkte, die wir adressieren:**

- ❌ **Manuelle Integrations-Hölle** -- Das Schreiben von benutzerdefinierten Skripten zur Verbindung verschiedener APIs dauert Stunden oder Tage
- ❌ **Teurer SaaS-Lock-In** -- Kommerzielle Automatisierungstools berechnen pro Workflow-Ausführung oder Benutzer-Lizenz
- ❌ **Begrenzte Flexibilität** -- Low-Code-Plattformen sind einfach zu starten, aber schwer für komplexe Anwendungsfälle anzupassen
- ❌ **Anbieter-Abhängigkeit** -- Nur-Cloud-Lösungen bedeuten, dass Sie Ihre Automatisierungslogik oder Daten nicht besitzen
- ❌ **Steile Lernkurve** -- Traditionelle Workflow-Engines erfordern tiefes technisches Wissen zur Einrichtung

### FluxTurns Lösung

✅ **KI-gestützte Geschwindigkeit** -- Verwandeln Sie Ideen in funktionsfähige Workflows in Sekunden, nicht Stunden
✅ **Open-Source-Freiheit** -- Kein Vendor Lock-In, keine Gebühren pro Ausführung, volle Kontrolle über Ihren Code
✅ **Selbst gehosteter Datenschutz** -- Behalten Sie sensible Daten und Workflows auf Ihrer Infrastruktur
✅ **Entwicklerfreundlich** -- Voller API-Zugriff, erweiterbares Konnektor-System, TypeScript-Codebasis
✅ **Visuell + Code** -- Starten Sie mit KI-Generierung, verfeinern Sie visuell, exportieren Sie bei Bedarf als Code

## Warum FluxTurn? (Vergleich)

| Feature | FluxTurn | Zapier/Make | n8n | Temporal | Custom Scripts |
|---------|----------|-------------|-----|----------|----------------|
| **KI-Workflow-Generierung** | ✅ Eingebaut | ❌ | ❌ | ❌ | ❌ |
| **Visueller Builder** | ✅ ReactFlow | ✅ | ✅ | ❌ | ❌ |
| **Selbst gehostet** | ✅ Kostenlos | ❌ | ✅ | ✅ | ✅ |
| **Open Source** | ✅ Apache 2.0 | ❌ | ✅ Fair-code | ✅ MIT | N/A |
| **Vorgefertigte Konnektoren** | ✅ 120+ | ✅ 5000+ | ✅ 400+ | ❌ | ❌ |
| **Echtzeit-Monitoring** | ✅ WebSocket | ✅ | ✅ | ✅ | ❌ |
| **Mehrsprachige UI** | ✅ 17 Sprachen | ✅ | ❌ | ❌ | N/A |
| **Keine Kosten pro Ausführung** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Produktionsreif** | ✅ NestJS | ✅ | ✅ | ✅ | ⚠️ |
| **Natürlichsprachliche Eingabe** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Vektorsuche (Qdrant)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Lernkurve** | 🟢 Niedrig | 🟢 Niedrig | 🟡 Mittel | 🔴 Hoch | 🔴 Hoch |

### Was macht FluxTurn einzigartig?

1. **KI-First-Design** -- Die einzige Workflow-Plattform mit nativer KI-Workflow-Generierung und natürlichsprachlichem Verständnis
2. **Moderner Tech Stack** -- React 19, NestJS, PostgreSQL, Redis, Qdrant -- gebaut für 2025 und darüber hinaus
3. **Entwicklererfahrung** -- Saubere TypeScript-Codebasis, erweiterbare Architektur, umfassende API
4. **Echtes Open Source** -- Apache 2.0 Lizenz, keine "Fair-Code"-Einschränkungen, Community-gesteuerte Entwicklung
5. **Multi-modale Eingabe** -- Natürliche Sprache ODER visueller Builder ODER API -- wählen Sie, was für Ihr Team funktioniert

## 📊 Projektaktivität und Statistiken

FluxTurn ist ein **aktiv gewartetes** Projekt mit einer wachsenden Community. Hier ist, was passiert:

### GitHub-Aktivität

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

### Community-Metriken

| Metrik | Status | Details |
|--------|--------|---------|
| **Gesamtzahl der Mitwirkenden** | ![Contributors](https://img.shields.io/github/contributors/fluxturn/fluxturn?style=flat-square) | Wachsende Entwickler-Community |
| **Gesamtzahl der Commits** | ![Commits](https://img.shields.io/github/commit-activity/t/fluxturn/fluxturn?style=flat-square) | Kontinuierliche Entwicklung |
| **Monatliche Commits** | ![Commit Activity](https://img.shields.io/github/commit-activity/m/fluxturn/fluxturn?style=flat-square) | Aktive Wartung |
| **Durchschnittliche PR-Prüfungszeit** | ~24-48 Stunden | Schnelle Feedback-Schleife |
| **Codequalität** | ![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen?style=flat-square) | TypeScript, ESLint, Prettier |
| **Testabdeckung** | ![Coverage](https://img.shields.io/badge/coverage-85%25-green?style=flat-square) | Gut getestete Codebasis |
| **Dokumentation** | ![Docs](https://img.shields.io/badge/docs-comprehensive-blue?style=flat-square) | Umfangreiche Anleitungen und API-Dokumentation |

### Sprach- und Code-Statistiken

<p align="left">
  <img src="https://img.shields.io/github/languages/top/fluxturn/fluxturn?style=for-the-badge&logo=typescript&color=blue" alt="Top Language">
  <img src="https://img.shields.io/github/languages/count/fluxturn/fluxturn?style=for-the-badge&color=purple" alt="Language Count">
  <img src="https://img.shields.io/github/repo-size/fluxturn/fluxturn?style=for-the-badge&color=orange" alt="Repo Size">
  <img src="https://img.shields.io/github/license/fluxturn/fluxturn?style=for-the-badge&color=green" alt="License">
</p>

### Highlights der aktuellen Aktivität

- ✅ **120+ Konnektoren** ausgeliefert und getestet
- ✅ **17 Sprachen** in der UI unterstützt
- ✅ **1000+ Commits** und es werden mehr
- ✅ **Aktiver Discord** Community mit Echtzeit-Support
- ✅ **Wöchentliche Releases** mit neuen Features und Bugfixes
- ✅ **Reaktionsschnelle Maintainer** -- PRs werden innerhalb von 1-2 Tagen geprüft

### Warum diese Zahlen wichtig sind

**Schnelle PR-Reviews** -- Wir schätzen Ihre Zeit. Die meisten Pull Requests erhalten innerhalb von 24-48 Stunden ein erstes Feedback, nicht erst nach Wochen.

**Aktive Entwicklung** -- Regelmäßige Commits bedeuten, dass sich das Projekt weiterentwickelt. Neue Features, Bugfixes und Verbesserungen werden kontinuierlich ausgeliefert.

**Wachsende Mitwirkende** -- Mehr Mitwirkende = mehr Perspektiven, bessere Codequalität und schnellere Feature-Entwicklung.

**Hohe Testabdeckung** -- 85%+ Abdeckung bedeutet, dass Sie selbstbewusst beitragen können, da Tests Regressionen erkennen.

**Umfassende Dokumentation** -- Detaillierte Dokumentation bedeutet weniger Zeit mit Problemen, mehr Zeit mit dem Bauen.

### Machen Sie mit!

Möchten Sie Ihre Beiträge hier sehen? Schauen Sie sich unseren [Schnellen Beitragsleitfaden](#-schneller-beitragsleitfaden) unten an!

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

Das war's! Greifen Sie auf die App unter `http://localhost:5185` und auf die API unter `http://localhost:5005` zu.

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

**Backend** (`/backend`) -- NestJS, PostgreSQL (raw SQL), Redis, Socket.IO, LangChain, 120+ Konnektoren

## Konnektoren

FluxTurn wird mit 120+ Konnektoren in diesen Kategorien geliefert:

| Kategorie | Konnektoren |
|----------|-----------|
| **KI & ML** | OpenAI, OpenAI Chatbot, Anthropic, Google AI, Google Gemini, AWS Bedrock |
| **Analytik** | Google Analytics, Grafana, Metabase, Mixpanel, PostHog, Segment, Splunk |
| **CMS** | WordPress, Contentful, Ghost, Medium, Webflow |
| **Kommunikation** | Slack, Gmail, Microsoft Teams, Telegram, Discord, Twilio, WhatsApp, AWS SES, SMTP, IMAP, POP3, Google Calendar, Calendly, Discourse, Matrix, Mattermost |
| **CRM & Vertrieb** | HubSpot, Salesforce, Pipedrive, Zoho CRM, Airtable, Monday.com |
| **Datenverarbeitung** | Supabase, Scrapfly, Extract From File |
| **Datenbank** | Elasticsearch |
| **Entwicklung** | GitHub, GitLab, Bitbucket, Git, Jenkins, Travis CI, Netlify, n8n, npm |
| **E-Commerce** | Shopify, Stripe, PayPal, WooCommerce, Magento, Paddle, Gumroad |
| **Finanzen** | QuickBooks, Plaid, Chargebee, Wise, Xero |
| **Formulare** | Google Forms, Jotform, Typeform |
| **Marketing** | Mailchimp, Klaviyo, SendGrid, Brevo, ActiveCampaign, Google Ads, Facebook Ads |
| **Produktivität** | Figma, Todoist, Spotify, Clockify, Toggl, Harvest |
| **Projektmanagement** | Jira, Asana, Trello, Notion, Linear, ClickUp |
| **Soziale Medien** | Twitter/X, Facebook, Instagram, TikTok, LinkedIn, Pinterest, Reddit |
| **Speicher** | Google Drive, Google Docs, Google Sheets, Dropbox, AWS S3, PostgreSQL, MySQL, MongoDB, Redis, Snowflake |
| **Support** | Zendesk, Intercom, Freshdesk, ServiceNow, PagerDuty, Sentry |
| **Dienstprogramme** | Bitly, DeepL, FTP, SSH, Execute Command |
| **Video** | YouTube, Zoom |

[Alle Konnektoren anzeigen &rarr;](docs/connectors.md)

## i18n

FluxTurn unterstützt 17 Sprachen über i18next:

- Englisch, Japanisch, Chinesisch, Koreanisch, Spanisch, Französisch, Deutsch, Italienisch, Russisch, Portugiesisch (BR), Niederländisch, Polnisch, Ukrainisch, Vietnamesisch, Indonesisch, Arabisch, Hindi

Möchten Sie eine neue Sprache hinzufügen? Siehe [Übersetzungsleitfaden](docs/contributing/translations.md).

## 🚀 Warum zu FluxTurn beitragen?

FluxTurn ist mehr als nur ein weiteres Open-Source-Projekt -- es ist eine Gelegenheit, mit modernster Technologie zu arbeiten und gleichzeitig etwas zu entwickeln, das echte Probleme für Entwickler weltweit löst.

### Was Sie gewinnen werden

**📚 Lernen Sie den modernen Tech Stack**
- **React 19** -- Neueste React-Funktionen einschließlich Server Components
- **NestJS** -- Professionelles Backend-Framework, das von Unternehmen verwendet wird
- **LangChain** -- KI/ML-Integration und Agent-Orchestrierung
- **Vektordatenbanken** -- Arbeiten Sie mit Qdrant für semantische Suche
- **ReactFlow** -- Erstellen Sie interaktive knotenbasierte UIs
- **Echtzeitsysteme** -- WebSocket, Redis und ereignisgesteuerte Architektur

**💼 Erstellen Sie Ihr Portfolio**
- Tragen Sie zu einer **produktionsreifen** Plattform bei, die von echten Unternehmen verwendet wird
- Arbeiten Sie an Features, die in Ihrem GitHub-Profil erscheinen
- Erhalten Sie Anerkennung in unserer Mitwirkenden-Ruhmeshalle
- Bauen Sie Expertise in **Workflow-Automatisierung** und **KI-Integration** auf -- hochgeschätzte Fähigkeiten im Jahr 2026

**🤝 Treten Sie einer wachsenden Community bei**
- Vernetzen Sie sich mit Entwicklern aus der ganzen Welt
- Erhalten Sie Code-Reviews von erfahrenen Maintainern
- Lernen Sie Best Practices in Software-Architektur
- Nehmen Sie an technischen Diskussionen und Designentscheidungen teil

**🎯 Echten Einfluss ausüben**
- Ihr Code wird Tausenden von Entwicklern helfen, ihre Workflows zu automatisieren
- Sehen Sie Ihre Features in Produktionsumgebungen verwendet werden
- Beeinflussen Sie die Richtung einer KI-gestützten Automatisierungsplattform

**⚡ Schnelles Onboarding**
- Docker-basiertes Setup bringt Sie in **unter 5 Minuten** zum Laufen
- Gut dokumentierte Codebasis mit klarer Architektur
- Freundliche Maintainer, die innerhalb von 24-48 Stunden auf PRs antworten
- "Good first issue"-Labels für Neueinsteiger

## 🗺️ Projekt-Roadmap

Hier ist, was wir entwickeln und wo Sie beitragen können. Mit 🆘 markierte Punkte benötigen Hilfe!

### Q2 2026 (Aktuelles Quartal)

**🤖 KI & Intelligenz**
- [ ] 🆘 **KI-Workflow-Optimierung** -- Automatische Vorschläge zur Leistungsverbesserung für Workflows
- [ ] **Multi-Agent-Workflows** -- Unterstützung für parallele KI-Agenten mit Koordination
- [ ] 🆘 **Natürlichsprachliche Workflow-Bearbeitung** -- "Fehlerbehandlung zu Schritt 3 hinzufügen" aktualisiert den Workflow
- [ ] **Intelligente Konnektor-Vorschläge** -- KI empfiehlt Konnektoren basierend auf Workflow-Kontext

**🔌 Konnektoren & Integrationen**
- [ ] 🆘 **50+ Neue Konnektoren** -- Notion, Linear, Airtable, Make.com, etc.
- [ ] **Konnektor-Marktplatz** -- Von der Community beigesteuerte Konnektoren
- [ ] 🆘 **GraphQL-Unterstützung** -- GraphQL-Konnektor für moderne APIs hinzufügen
- [ ] **Datenbank-Konnektoren** -- Verbesserungen für Supabase, PlanetScale, Neon

**🎨 Verbesserungen des visuellen Builders**
- [ ] 🆘 **Workflow-Vorlagen** -- Vorgefertigte Vorlagen für häufige Anwendungsfälle
- [ ] **Bedingte Verzweigungs-UI** -- Visueller If/Else-Flow-Builder
- [ ] 🆘 **Workflow-Versionierung** -- Workflow-Änderungen verfolgen und zurücksetzen
- [ ] **Kollaborative Bearbeitung** -- Mehrere Benutzer bearbeiten denselben Workflow

### Q3 2026

**⚡ Leistung & Skalierung**
- [ ] **Verteilte Ausführung** -- Workflows über mehrere Worker ausführen
- [ ] 🆘 **Workflow-Caching** -- Teure Operationen zwischenspeichern
- [ ] **Rate Limiting pro Konnektor** -- Automatisches Backoff und Retry
- [ ] **Horizontale Skalierung** -- Multi-Instanz-Unterstützung mit Redis Pub/Sub

**🔐 Enterprise-Features**
- [ ] **RBAC (Role-Based Access Control)** -- Benutzerberechtigungen und Teams
- [ ] 🆘 **Audit-Logs** -- Alle Workflow-Änderungen und -Ausführungen verfolgen
- [ ] **SSO-Integration** -- SAML, OAuth2, LDAP-Unterstützung
- [ ] **Secrets Management** -- HashiCorp Vault-Integration

**📊 Monitoring & Observability**
- [ ] 🆘 **Metriken-Dashboard** -- Ausführungszeit, Erfolgsrate, Fehler-Tracking
- [ ] **OpenTelemetry-Integration** -- Traces nach Jaeger, Datadog, etc. exportieren
- [ ] **Benachrichtigungssystem** -- Bei Workflow-Fehlern benachrichtigen
- [ ] 🆘 **Workflow-Analytik** -- Nutzungsmuster und Optimierungsempfehlungen

### Q4 2026 & Darüber hinaus

**🌐 Plattform-Erweiterung**
- [ ] **CLI-Tool** -- Workflows vom Terminal aus verwalten
- [ ] 🆘 **Workflow as Code** -- Workflows in YAML/JSON definieren
- [ ] **CI/CD-Integration** -- GitHub Actions, GitLab CI-Konnektoren
- [ ] **Mobile App** -- iOS/Android Workflow-Monitoring

**🧩 Entwicklererfahrung**
- [ ] 🆘 **Plugin-System** -- Benutzerdefinierte Nodes und Konnektoren über Plugins
- [ ] **Workflow-Testing-Framework** -- Unit-Tests für Workflows
- [ ] **Lokaler Entwicklungsmodus** -- Offline-Workflow-Entwicklung
- [ ] **API-Schema-Validierung** -- Konnektor-Antworten automatisch validieren

### Wie Sie die Roadmap beeinflussen können

💡 **Haben Sie Ideen?** Öffnen Sie eine [GitHub Discussion](https://github.com/fluxturn/fluxturn/discussions) oder treten Sie unserem [Discord](https://discord.gg/fluxturn) bei

🗳️ **Stimmen Sie für Features ab** -- Markieren Sie Issues, die Ihnen wichtig sind, um uns bei der Priorisierung zu helfen

🛠️ **Möchten Sie etwas entwickeln, das nicht aufgelistet ist?** -- Schlagen Sie es vor! Wir lieben Community-gesteuerte Features

## 🎯 Schneller Beitragsleitfaden

Beginnen Sie in **unter 10 Minuten** mit dem Beitragen:

### Schritt 1: Richten Sie Ihre Umgebung ein

```bash
# Forken Sie das Repository auf GitHub, klonen Sie dann Ihren Fork
git clone https://github.com/IHR_BENUTZERNAME/fluxturn.git
cd fluxturn

# Starten Sie mit Docker (einfachster Weg)
cp backend/.env.example backend/.env
docker compose up -d

# Zugriff auf die App
# Frontend: http://localhost:5185
# Backend API: http://localhost:5005
```

**Das war's!** Sie haben FluxTurn lokal am Laufen.

### Schritt 2: Finden Sie etwas zum Arbeiten

Wählen Sie basierend auf Ihrer Erfahrungsstufe:

**🟢 Anfängerfreundlich**
- 📝 [Tippfehler beheben oder Dokumentation verbessern](https://github.com/fluxturn/fluxturn/labels/documentation)
- 🌍 [Übersetzungen hinzufügen](https://github.com/fluxturn/fluxturn/labels/i18n) -- Wir unterstützen 17 Sprachen
- 🐛 [Einfache Bugs beheben](https://github.com/fluxturn/fluxturn/labels/good%20first%20issue)
- ✨ [UI/UX verbessern](https://github.com/fluxturn/fluxturn/labels/ui%2Fux)

**🟡 Fortgeschritten**
- 🔌 [Neuen Konnektor hinzufügen](https://github.com/fluxturn/fluxturn/labels/connector) -- Siehe unseren [Konnektor-Entwicklungsleitfaden](docs/guides/connector-development.md)
- 🎨 [Visuellen Builder verbessern](https://github.com/fluxturn/fluxturn/labels/visual-builder)
- 🧪 [Tests schreiben](https://github.com/fluxturn/fluxturn/labels/tests)
- 🚀 [Leistungsverbesserungen](https://github.com/fluxturn/fluxturn/labels/performance)

**🔴 Fortgeschritten**
- 🤖 [KI/ML-Features](https://github.com/fluxturn/fluxturn/labels/ai)
- ⚙️ [Kern-Engine-Verbesserungen](https://github.com/fluxturn/fluxturn/labels/core)
- 🏗️ [Architektur-Verbesserungen](https://github.com/fluxturn/fluxturn/labels/architecture)
- 🔐 [Sicherheits-Features](https://github.com/fluxturn/fluxturn/labels/security)

### Schritt 3: Nehmen Sie Ihre Änderungen vor

```bash
# Erstellen Sie einen neuen Branch
git checkout -b feature/ihr-feature-name

# Nehmen Sie Ihre Änderungen vor
# - Frontend-Code: /frontend/src
# - Backend-Code: /backend/src
# - Konnektoren: /backend/src/modules/fluxturn/connectors

# Testen Sie Ihre Änderungen
npm run test

# Commit mit klarer Nachricht
git commit -m "feat: add new connector for Notion API"
```

### Schritt 4: Reichen Sie Ihren Pull Request ein

```bash
# Push zu Ihrem Fork
git push origin feature/ihr-feature-name

# Öffnen Sie einen PR auf GitHub
# - Beschreiben Sie, was Sie geändert haben und warum
# - Verlinken Sie zu verwandten Issues
# - Fügen Sie Screenshots hinzu, wenn es eine UI-Änderung ist
```

**Was passiert als nächstes?**
- ✅ Automatisierte Tests laufen auf Ihrem PR
- 👀 Ein Maintainer überprüft Ihren Code (normalerweise innerhalb von 24-48 Stunden)
- 💬 Wir können Änderungen oder Verbesserungen vorschlagen
- 🎉 Sobald genehmigt, wird Ihr Code gemerged!

### Beitrags-Tipps

✨ **Klein anfangen** -- Ihr erster PR muss kein riesiges Feature sein
📖 **Lesen Sie den Code** -- Durchsuchen Sie vorhandene Konnektoren oder Komponenten nach Beispielen
❓ **Stellen Sie Fragen** -- Treten Sie unserem [Discord](https://discord.gg/fluxturn) bei, wenn Sie feststecken
🧪 **Schreiben Sie Tests** -- PRs mit Tests werden schneller gemerged
📝 **Dokumentieren Sie Ihren Code** -- Fügen Sie Kommentare für komplexe Logik hinzu

### Benötigen Sie Hilfe?

- 💬 [Discord](https://discord.gg/fluxturn) -- Chatten Sie mit Maintainern und Mitwirkenden
- 📖 [Beitragsleitfaden](CONTRIBUTING.md) -- Detaillierte Beitragsrichtlinien
- 🐛 [GitHub Issues](https://github.com/fluxturn/fluxturn/issues) -- Melden Sie Bugs oder fordern Sie Features an
- 💡 [Discussions](https://github.com/fluxturn/fluxturn/discussions) -- Stellen Sie Fragen, teilen Sie Ideen

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
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn&anon=1&max=100&columns=10" />
</a>

Möchten Sie Ihr Gesicht hier sehen? Schauen Sie sich unseren [Beitragsleitfaden](CONTRIBUTING.md) an und beginnen Sie noch heute beizutragen!

## 💬 Treten Sie Unserer Community Bei

Verbinden Sie sich mit Entwicklern, erhalten Sie Hilfe und bleiben Sie über die neuesten Entwicklungen von FluxTurn auf dem Laufenden!

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

### Wo Sie Uns Finden

| Plattform | Zweck | Link |
|----------|---------|------|
| 💬 **Discord** | Echtzeit-Chat, Hilfe erhalten, Funktionen diskutieren | [Server Beitreten](https://discord.gg/fluxturn) |
| 💡 **GitHub Discussions** | Fragen stellen, Ideen teilen, Funktionen anfordern | [Diskussion Starten](https://github.com/fluxturn/fluxturn/discussions) |
| 🐦 **Twitter/X** | Produkt-Updates, Ankündigungen, Tipps | [@fluxturn](https://twitter.com/fluxturn) |
| 📧 **Email** | Direkter Kontakt mit Maintainern | hello@fluxturn.com |
| 🌐 **Website** | Dokumentation, Anleitungen, Blog | [fluxturn.com](https://fluxturn.com) |

### Community-Richtlinien

- 🤝 **Seien Sie Respektvoll** -- Behandeln Sie alle mit Respekt und Freundlichkeit
- 💡 **Teilen Sie Wissen** -- Helfen Sie anderen zu lernen und zu wachsen
- 🐛 **Melden Sie Probleme** -- Fehler gefunden? Lassen Sie es uns auf GitHub Issues wissen
- 🎉 **Feiern Sie Erfolge** -- Teilen Sie Ihre Workflows und Erfolgsgeschichten
- 🌍 **Denken Sie Global** -- Wir sind eine weltweite Community mit über 17 Sprachen

## Lizenz

Dieses Projekt ist unter der [Apache License 2.0](LICENSE) lizenziert.

## Danksagungen

Erstellt mit [NestJS](https://nestjs.com), [React](https://react.dev), [ReactFlow](https://reactflow.dev), [TypeScript](https://typescriptlang.org) und [i18next](https://i18next.com).

---

<p align="center">
  <a href="https://fluxturn.com">Website</a> |
  <a href="https://github.com/fluxturn/fluxturn/wiki">Dokumentation</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>

---

<p align="center">
  <strong>Mit ❤️ von der <a href="https://fluxturn.com">fluxturn</a> Community gebaut</strong>
</p>

<p align="center">
  Wenn Sie dieses Projekt nützlich finden, geben Sie ihm bitte einen Stern! ⭐
  <br><br>
  <a href="https://github.com/fluxturn/fluxturn/stargazers">
    <img src="https://img.shields.io/github/stars/fluxturn/fluxturn?style=social" alt="Star on GitHub">
  </a>
</p>
