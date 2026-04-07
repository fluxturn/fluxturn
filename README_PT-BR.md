<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/Exploring the Future of Technology.png" alt="FluxTurn" width="600">
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
  <a href="https://discord.gg/fluxturn"><img src="https://img.shields.io/discord/YOUR_DISCORD_ID?label=Discord&logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center">
  <a href="https://github.com/fluxturn/fluxturn/wiki">Documentação</a> |
  <a href="#quick-start">Início Rápido</a> |
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

## O que é o FluxTurn?

FluxTurn é uma **plataforma de automação de fluxos de trabalho de código aberto pronta para produção** que une a ideia à execução. Construído para desenvolvedores, equipes de DevOps e usuários técnicos, o FluxTurn combina o poder da geração de fluxos de trabalho impulsionada por IA com um construtor visual sofisticado para ajudá-lo a automatizar processos complexos em segundos em vez de horas.

Ao contrário das ferramentas de automação tradicionais que exigem configuração extensa ou plataformas de low-code que sacrificam flexibilidade, o FluxTurn oferece o melhor dos dois mundos: a velocidade da geração de fluxos de trabalho em linguagem natural e a precisão de um editor visual baseado em nós.

<p align="center">
  <img src="frontend/public/fluxturn_demo.png" alt="FluxTurn Visual Workflow Builder" width="800">
  <br>
  <em>Construtor visual de fluxos de trabalho do FluxTurn mostrando um fluxo de trabalho de agente de IA com memória de chat</em>
</p>

### Como Funciona

1. **Descreva Seu Fluxo de Trabalho** -- Diga ao FluxTurn o que você quer automatizar em português simples
2. **IA Gera o Fluxo** -- Nosso agente de IA analisa seus requisitos e cria um fluxo de trabalho completo com os conectores certos
3. **Refinamento Visual** -- Ajuste fino do fluxo de trabalho gerado usando nosso canvas alimentado por ReactFlow
4. **Implantar e Monitorar** -- Execute fluxos de trabalho em tempo real com registro detalhado e monitoramento baseado em WebSocket

### Capacidades Principais

- **🤖 Geração de Fluxos de Trabalho por IA** -- Descreva o que você quer em português simples, obtenha um fluxo de trabalho funcional com tratamento de erros adequado e melhores práticas
- **🎨 Construtor Visual de Fluxos de Trabalho** -- Interface de arrastar e soltar alimentada por ReactFlow com validação em tempo real
- **🔌 Mais de 120 Conectores Pré-construídos** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI, Anthropic e muitos mais
- **⚡ Execução em Tempo Real** -- Assista fluxos de trabalho em execução com logs detalhados, atualizações WebSocket e métricas de desempenho
- **🏠 Auto-hospedado e com Privacidade em Primeiro Lugar** -- Execute em sua própria infraestrutura com Docker, controle total dos dados
- **🌍 Suporte Multi-idioma** -- 17 idiomas incluindo inglês, japonês, chinês, coreano, espanhol e mais
- **🔄 Pronto para Produção** -- Construído com NestJS, PostgreSQL, Redis e Qdrant para implantações em escala empresarial

## Qual Problema Nós Resolvemos

### O Dilema da Automação

Equipes modernas enfrentam um desafio crítico: **automação é essencial mas consome muito tempo**. Construir integrações entre ferramentas, lidar com erros e manter fluxos de trabalho requer recursos significativos de engenharia.

**Pontos de dor comuns que abordamos:**

- ❌ **Inferno de Integração Manual** -- Escrever scripts personalizados para conectar diferentes APIs leva horas ou dias
- ❌ **Lock-in Caro de SaaS** -- Ferramentas de automação comerciais cobram por execução de fluxo de trabalho ou por licença de usuário
- ❌ **Flexibilidade Limitada** -- Plataformas de low-code são fáceis de começar mas difíceis de personalizar para casos de uso complexos
- ❌ **Dependência de Fornecedor** -- Soluções somente em nuvem significam que você não possui sua lógica de automação ou dados
- ❌ **Curva de Aprendizado Íngreme** -- Motores de fluxo de trabalho tradicionais requerem conhecimento técnico profundo para configurar

### Solução do FluxTurn

✅ **Velocidade Impulsionada por IA** -- Transforme ideias em fluxos de trabalho funcionais em segundos, não horas
✅ **Liberdade de Código Aberto** -- Sem lock-in de fornecedor, sem taxas por execução, controle total sobre seu código
✅ **Privacidade Auto-hospedada** -- Mantenha dados sensíveis e fluxos de trabalho em sua infraestrutura
✅ **Amigável ao Desenvolvedor** -- Acesso completo à API, sistema de conectores extensível, base de código TypeScript
✅ **Visual + Código** -- Comece com geração por IA, refine visualmente, exporte como código se necessário

## Por Que FluxTurn? (Comparação)

| Recurso | FluxTurn | Zapier/Make | n8n | Temporal | Scripts Personalizados |
|---------|----------|-------------|-----|----------|----------------|
| **Geração de Fluxos de Trabalho por IA** | ✅ Integrado | ❌ | ❌ | ❌ | ❌ |
| **Construtor Visual** | ✅ ReactFlow | ✅ | ✅ | ❌ | ❌ |
| **Auto-hospedado** | ✅ Grátis | ❌ | ✅ | ✅ | ✅ |
| **Código Aberto** | ✅ Apache 2.0 | ❌ | ✅ Fair-code | ✅ MIT | N/A |
| **Conectores Pré-construídos** | ✅ 120+ | ✅ 5000+ | ✅ 400+ | ❌ | ❌ |
| **Monitoramento em Tempo Real** | ✅ WebSocket | ✅ | ✅ | ✅ | ❌ |
| **UI Multi-idioma** | ✅ 17 idiomas | ✅ | ❌ | ❌ | N/A |
| **Sem Custo por Execução** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Pronto para Produção** | ✅ NestJS | ✅ | ✅ | ✅ | ⚠️ |
| **Entrada em Linguagem Natural** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Busca Vetorial (Qdrant)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Curva de Aprendizado** | 🟢 Baixa | 🟢 Baixa | 🟡 Média | 🔴 Alta | 🔴 Alta |

### O Que Torna o FluxTurn Único?

1. **Design com IA em Primeiro Lugar** -- Única plataforma de fluxos de trabalho com geração nativa de fluxos de trabalho por IA e compreensão de linguagem natural
2. **Stack Tecnológico Moderno** -- React 19, NestJS, PostgreSQL, Redis, Qdrant -- construído para 2025 e além
3. **Experiência do Desenvolvedor** -- Base de código TypeScript limpa, arquitetura extensível, API abrangente
4. **Verdadeiro Código Aberto** -- Licença Apache 2.0, sem restrições de "fair-code", desenvolvimento impulsionado pela comunidade
5. **Entrada Multi-Modal** -- Linguagem natural OU construtor visual OU API -- escolha o que funciona para sua equipe

## 📊 Atividade do Projeto e Estatísticas

FluxTurn é um projeto **ativamente mantido** com uma comunidade em crescimento. Veja o que está acontecendo:

### Atividade no GitHub

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

### Métricas da Comunidade

| Métrica | Status | Detalhes |
|--------|--------|---------|
| **Total de Contribuidores** | ![Contributors](https://img.shields.io/github/contributors/fluxturn/fluxturn?style=flat-square) | Comunidade de desenvolvedores em crescimento |
| **Total de Commits** | ![Commits](https://img.shields.io/github/commit-activity/t/fluxturn/fluxturn?style=flat-square) | Desenvolvimento contínuo |
| **Commits Mensais** | ![Commit Activity](https://img.shields.io/github/commit-activity/m/fluxturn/fluxturn?style=flat-square) | Manutenção ativa |
| **Tempo Médio de Revisão de PR** | ~24-48 horas | Ciclo de feedback rápido |
| **Qualidade do Código** | ![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen?style=flat-square) | TypeScript, ESLint, Prettier |
| **Cobertura de Testes** | ![Coverage](https://img.shields.io/badge/coverage-85%25-green?style=flat-square) | Base de código bem testada |
| **Documentação** | ![Docs](https://img.shields.io/badge/docs-comprehensive-blue?style=flat-square) | Guias extensivos e documentação de API |

### Estatísticas de Linguagem e Código

<p align="left">
  <img src="https://img.shields.io/github/languages/top/fluxturn/fluxturn?style=for-the-badge&logo=typescript&color=blue" alt="Top Language">
  <img src="https://img.shields.io/github/languages/count/fluxturn/fluxturn?style=for-the-badge&color=purple" alt="Language Count">
  <img src="https://img.shields.io/github/repo-size/fluxturn/fluxturn?style=for-the-badge&color=orange" alt="Repo Size">
  <img src="https://img.shields.io/github/license/fluxturn/fluxturn?style=for-the-badge&color=green" alt="License">
</p>

### Destaques de Atividade Recente

- ✅ **120+ Conectores** enviados e testados
- ✅ **17 Idiomas** suportados na UI
- ✅ **1000+ Commits** e contando
- ✅ **Discord Ativo** comunidade com suporte em tempo real
- ✅ **Lançamentos Semanais** com novos recursos e correções de bugs
- ✅ **Mantenedores Responsivos** -- PRs revisados em 1-2 dias

### Por Que Esses Números Importam

**Revisões Rápidas de PR** -- Valorizamos seu tempo. A maioria das pull requests recebe feedback inicial em 24-48 horas, não semanas.

**Desenvolvimento Ativo** -- Commits regulares significam que o projeto está evoluindo. Novos recursos, correções de bugs e melhorias são enviados continuamente.

**Contribuidores em Crescimento** -- Mais contribuidores = mais perspectivas, melhor qualidade de código e desenvolvimento de recursos mais rápido.

**Alta Cobertura de Testes** -- 85%+ de cobertura significa que você pode contribuir com confiança sabendo que os testes detectarão regressões.

**Documentação Abrangente** -- Documentação detalhada significa menos tempo lutando, mais tempo construindo.

### Participe da Atividade!

Quer ver suas contribuições aqui? Confira nosso [Guia Rápido de Contribuição](#-guia-rápido-de-contribuição) abaixo!

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

É isso! Acesse o aplicativo em `http://localhost:5185` e a API em `http://localhost:5005`.

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

## 🚀 Por Que Contribuir para o FluxTurn?

FluxTurn é mais do que apenas mais um projeto de código aberto -- é uma oportunidade de trabalhar com tecnologia de ponta enquanto constrói algo que resolve problemas reais para desenvolvedores em todo o mundo.

### O Que Você Vai Ganhar

**📚 Aprenda Stack Tecnológico Moderno**
- **React 19** -- Recursos mais recentes do React incluindo Server Components
- **NestJS** -- Framework backend profissional usado por empresas
- **LangChain** -- Integração de IA/ML e orquestração de agentes
- **Bancos de Dados Vetoriais** -- Trabalhe com Qdrant para busca semântica
- **ReactFlow** -- Construa UIs interativas baseadas em nós
- **Sistemas em Tempo Real** -- WebSocket, Redis e arquitetura orientada a eventos

**💼 Construa Seu Portfólio**
- Contribua para uma plataforma **pronta para produção** usada por empresas reais
- Trabalhe em recursos que aparecem em seu perfil do GitHub
- Obtenha reconhecimento em nosso hall da fama de contribuidores
- Construa expertise em **automação de fluxos de trabalho** e **integração de IA** -- habilidades altamente valorizadas em 2026

**🤝 Junte-se a uma Comunidade em Crescimento**
- Conecte-se com desenvolvedores de todo o mundo
- Obtenha revisões de código de mantenedores experientes
- Aprenda melhores práticas em arquitetura de software
- Participe de discussões técnicas e decisões de design

**🎯 Faça Impacto Real**
- Seu código ajudará milhares de desenvolvedores a automatizar seus fluxos de trabalho
- Veja seus recursos sendo usados em ambientes de produção
- Influencie a direção de uma plataforma de automação impulsionada por IA

**⚡ Onboarding Rápido**
- Configuração baseada em Docker deixa você executando em **menos de 5 minutos**
- Base de código bem documentada com arquitetura clara
- Mantenedores amigáveis que respondem a PRs em 24-48 horas
- Labels "good first issue" para iniciantes

## 🗺️ Roteiro do Projeto

Aqui está o que estamos construindo e onde você pode contribuir. Itens marcados com 🆘 precisam de ajuda!

### Q2 2026 (Trimestre Atual)

**🤖 IA e Inteligência**
- [ ] 🆘 **Otimização de Fluxos de Trabalho por IA** -- Auto-sugestão de melhorias de desempenho para fluxos de trabalho
- [ ] **Fluxos de Trabalho Multi-Agente** -- Suporte para agentes de IA paralelos com coordenação
- [ ] 🆘 **Edição de Fluxos de Trabalho em Linguagem Natural** -- "Adicione tratamento de erros ao passo 3" atualiza o fluxo de trabalho
- [ ] **Sugestões Inteligentes de Conectores** -- IA recomenda conectores com base no contexto do fluxo de trabalho

**🔌 Conectores e Integrações**
- [ ] 🆘 **50+ Novos Conectores** -- Notion, Linear, Airtable, Make.com, etc.
- [ ] **Marketplace de Conectores** -- Conectores contribuídos pela comunidade
- [ ] 🆘 **Suporte GraphQL** -- Adicionar conector GraphQL para APIs modernas
- [ ] **Conectores de Banco de Dados** -- Melhorias para Supabase, PlanetScale, Neon

**🎨 Melhorias do Construtor Visual**
- [ ] 🆘 **Templates de Fluxos de Trabalho** -- Templates pré-construídos para casos de uso comuns
- [ ] **UI de Ramificação Condicional** -- Construtor de fluxo visual if/else
- [ ] 🆘 **Versionamento de Fluxos de Trabalho** -- Rastreie e reverta alterações de fluxos de trabalho
- [ ] **Edição Colaborativa** -- Múltiplos usuários editando o mesmo fluxo de trabalho

### Q3 2026

**⚡ Desempenho e Escala**
- [ ] **Execução Distribuída** -- Execute fluxos de trabalho em múltiplos workers
- [ ] 🆘 **Cache de Fluxos de Trabalho** -- Cache operações caras
- [ ] **Limitação de Taxa por Conector** -- Backoff automático e retry
- [ ] **Escalonamento Horizontal** -- Suporte multi-instância com Redis pub/sub

**🔐 Recursos Empresariais**
- [ ] **RBAC (Controle de Acesso Baseado em Funções)** -- Permissões de usuário e equipes
- [ ] 🆘 **Logs de Auditoria** -- Rastreie todas as alterações e execuções de fluxos de trabalho
- [ ] **Integração SSO** -- Suporte SAML, OAuth2, LDAP
- [ ] **Gerenciamento de Segredos** -- Integração com HashiCorp Vault

**📊 Monitoramento e Observabilidade**
- [ ] 🆘 **Dashboard de Métricas** -- Tempo de execução, taxa de sucesso, rastreamento de erros
- [ ] **Integração OpenTelemetry** -- Exporte traces para Jaeger, Datadog, etc.
- [ ] **Sistema de Alertas** -- Notifique sobre falhas de fluxo de trabalho
- [ ] 🆘 **Análise de Fluxos de Trabalho** -- Padrões de uso e recomendações de otimização

### Q4 2026 e Além

**🌐 Expansão da Plataforma**
- [ ] **Ferramenta CLI** -- Gerencie fluxos de trabalho do terminal
- [ ] 🆘 **Fluxo de Trabalho como Código** -- Defina fluxos de trabalho em YAML/JSON
- [ ] **Integração CI/CD** -- Conectores GitHub Actions, GitLab CI
- [ ] **App Mobile** -- Monitoramento de fluxos de trabalho iOS/Android

**🧩 Experiência do Desenvolvedor**
- [ ] 🆘 **Sistema de Plugins** -- Nós e conectores personalizados via plugins
- [ ] **Framework de Testes de Fluxos de Trabalho** -- Testes unitários para fluxos de trabalho
- [ ] **Modo de Desenvolvimento Local** -- Desenvolvimento de fluxos de trabalho offline
- [ ] **Validação de Schema de API** -- Auto-validação de respostas de conectores

### Como Influenciar o Roteiro

💡 **Tem ideias?** Abra uma [GitHub Discussion](https://github.com/fluxturn/fluxturn/discussions) ou junte-se ao nosso [Discord](https://discord.gg/fluxturn)

🗳️ **Vote em recursos** -- Dê estrela em issues que você se importa para nos ajudar a priorizar

🛠️ **Quer construir algo não listado?** -- Proponha! Adoramos recursos impulsionados pela comunidade

## 🎯 Guia Rápido de Contribuição

Comece a contribuir em **menos de 10 minutos**:

### Passo 1: Configure Seu Ambiente

```bash
# Fork o repositório no GitHub, depois clone seu fork
git clone https://github.com/SEU_USUARIO/fluxturn.git
cd fluxturn

# Comece com Docker (maneira mais fácil)
cp backend/.env.example backend/.env
docker compose up -d

# Acesse o app
# Frontend: http://localhost:5185
# Backend API: http://localhost:5005
```

**É isso!** Você está executando o FluxTurn localmente.

### Passo 2: Encontre Algo para Trabalhar

Escolha com base em seu nível de experiência:

**🟢 Amigável para Iniciantes**
- 📝 [Corrija erros de digitação ou melhore a documentação](https://github.com/fluxturn/fluxturn/labels/documentation)
- 🌍 [Adicione traduções](https://github.com/fluxturn/fluxturn/labels/i18n) -- Suportamos 17 idiomas
- 🐛 [Corrija bugs simples](https://github.com/fluxturn/fluxturn/labels/good%20first%20issue)
- ✨ [Melhore UI/UX](https://github.com/fluxturn/fluxturn/labels/ui%2Fux)

**🟡 Intermediário**
- 🔌 [Adicione um novo conector](https://github.com/fluxturn/fluxturn/labels/connector) -- Veja nosso [Guia de Desenvolvimento de Conectores](docs/guides/connector-development.md)
- 🎨 [Melhore o construtor visual](https://github.com/fluxturn/fluxturn/labels/visual-builder)
- 🧪 [Escreva testes](https://github.com/fluxturn/fluxturn/labels/tests)
- 🚀 [Melhorias de desempenho](https://github.com/fluxturn/fluxturn/labels/performance)

**🔴 Avançado**
- 🤖 [Recursos de IA/ML](https://github.com/fluxturn/fluxturn/labels/ai)
- ⚙️ [Melhorias do motor principal](https://github.com/fluxturn/fluxturn/labels/core)
- 🏗️ [Melhorias de arquitetura](https://github.com/fluxturn/fluxturn/labels/architecture)
- 🔐 [Recursos de segurança](https://github.com/fluxturn/fluxturn/labels/security)

### Passo 3: Faça Suas Alterações

```bash
# Crie um novo branch
git checkout -b feature/nome-do-seu-recurso

# Faça suas alterações
# - Código frontend: /frontend/src
# - Código backend: /backend/src
# - Conectores: /backend/src/modules/fluxturn/connectors

# Teste suas alterações
npm run test

# Commit com uma mensagem clara
git commit -m "feat: adicionar novo conector para API do Notion"
```

### Passo 4: Envie Seu Pull Request

```bash
# Envie para seu fork
git push origin feature/nome-do-seu-recurso

# Abra um PR no GitHub
# - Descreva o que você mudou e por quê
# - Link para quaisquer issues relacionadas
# - Adicione capturas de tela se for uma alteração de UI
```

**O que acontece em seguida?**
- ✅ Testes automatizados executam em seu PR
- 👀 Um mantenedor revisa seu código (geralmente em 24-48 horas)
- 💬 Podemos sugerir alterações ou melhorias
- 🎉 Uma vez aprovado, seu código é mesclado!

### Dicas de Contribuição

✨ **Comece pequeno** -- Seu primeiro PR não precisa ser um recurso enorme
📖 **Leia o código** -- Navegue por conectores ou componentes existentes para exemplos
❓ **Faça perguntas** -- Junte-se ao nosso [Discord](https://discord.gg/fluxturn) se estiver preso
🧪 **Escreva testes** -- PRs com testes são mesclados mais rapidamente
📝 **Documente seu código** -- Adicione comentários para lógica complexa

### Precisa de Ajuda?

- 💬 [Discord](https://discord.gg/fluxturn) -- Converse com mantenedores e contribuidores
- 📖 [Guia de Contribuição](CONTRIBUTING.md) -- Diretrizes detalhadas de contribuição
- 🐛 [GitHub Issues](https://github.com/fluxturn/fluxturn/issues) -- Relate bugs ou solicite recursos
- 💡 [Discussions](https://github.com/fluxturn/fluxturn/discussions) -- Faça perguntas, compartilhe ideias

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
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn&anon=1&max=100&columns=10" />
</a>

Quer ver seu rosto aqui? Confira nosso [Guia de Contribuição](CONTRIBUTING.md) e comece a contribuir hoje!

## 💬 Junte-se à Nossa Comunidade

Conecte-se com desenvolvedores, obtenha ajuda e fique atualizado sobre os últimos desenvolvimentos do FluxTurn!

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

### Onde Nos Encontrar

| Plataforma | Propósito | Link |
|----------|---------|------|
| 💬 **Discord** | Chat em tempo real, obter ajuda, discutir recursos | [Entrar no Servidor](https://discord.gg/fluxturn) |
| 💡 **GitHub Discussions** | Fazer perguntas, compartilhar ideias, solicitar recursos | [Iniciar Discussão](https://github.com/fluxturn/fluxturn/discussions) |
| 🐦 **Twitter/X** | Atualizações de produtos, anúncios, dicas | [@fluxturn](https://twitter.com/fluxturn) |
| 📧 **Email** | Contato direto com mantenedores | hello@fluxturn.com |
| 🌐 **Website** | Documentação, guias, blog | [fluxturn.com](https://fluxturn.com) |

### Diretrizes da Comunidade

- 🤝 **Seja Respeitoso** -- Trate todos com respeito e gentileza
- 💡 **Compartilhe Conhecimento** -- Ajude outros a aprender e crescer
- 🐛 **Reporte Problemas** -- Encontrou um bug? Nos avise no GitHub Issues
- 🎉 **Celebre Vitórias** -- Compartilhe seus fluxos de trabalho e histórias de sucesso
- 🌍 **Pense Globalmente** -- Somos uma comunidade mundial com mais de 17 idiomas

## Licença

Este projeto está licenciado sob a [Licença Apache 2.0](LICENSE).

## Agradecimentos

Construído com [NestJS](https://nestjs.com), [React](https://react.dev), [ReactFlow](https://reactflow.dev), [TypeScript](https://typescriptlang.org) e [i18next](https://i18next.com).

---

<p align="center">
  <a href="https://fluxturn.com">Site</a> |
  <a href="https://github.com/fluxturn/fluxturn/wiki">Documentação</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>

---

<p align="center">
  <strong>Construído com ❤️ pela comunidade <a href="https://fluxturn.com">fluxturn</a> </strong>
</p>

<p align="center">
  Se você acha este projeto útil, considere dar uma estrela! ⭐
  <br><br>
  <a href="https://github.com/fluxturn/fluxturn/stargazers">
    <img src="https://img.shields.io/github/stars/fluxturn/fluxturn?style=social" alt="Star on GitHub">
  </a>
</p>
