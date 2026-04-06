<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/fluxturn_1.png" alt="FluxTurn" width="600">
  </a>
</p>

<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>开源AI驱动的工作流自动化平台</strong>
  </p>
  <p align="center">
    通过自然语言和可视化构建器构建、自动化和编排工作流。
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
  <a href="https://github.com/fluxturn/fluxturn/wiki">文档</a> |
  <a href="#quick-start">快速开始</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="CONTRIBUTING.md">贡献</a>
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

## 什么是FluxTurn？

FluxTurn是一个开源工作流自动化平台，让您能够连接应用、自动化流程并构建AI驱动的工作流——所有这一切都可以通过可视化构建器或自然语言来完成。

**核心功能：**

- **AI工作流生成** -- 用简单的中文描述您想要的，获得一个可运行的工作流
- **可视化工作流构建器** -- 由ReactFlow驱动的拖放界面
- **120+连接器** -- Slack、Gmail、Shopify、HubSpot、Jira、Stripe、OpenAI等
- **实时执行** -- 通过详细日志和监控观察工作流运行
- **自托管** -- 使用Docker在您自己的基础设施上运行

## 快速开始

### Docker（推荐）

从项目根目录运行以下命令：

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
cp backend/.env.example backend/.env
# 使用您的数据库凭据和JWT密钥编辑backend/.env
docker compose up -d
```

就这样！在`http://localhost:5173`访问应用，在`http://localhost:5005`访问API。

### 手动设置

**先决条件：** Node.js 18+、PostgreSQL 14+、Redis 7+

```bash
# 克隆
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn

# 后端
cd backend
cp .env.example .env    # 使用您的配置编辑.env
npm install
npm run start:dev

# 前端（在新终端中）
cd frontend
cp .env.example .env
npm install
npm run dev
```

## 架构

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

**前端** (`/frontend`) -- React 19、Vite、TailwindCSS、ReactFlow、i18next、CodeMirror

**后端** (`/backend`) -- NestJS、PostgreSQL（原始SQL）、Redis、Socket.IO、LangChain、120+连接器

## 连接器

FluxTurn提供这些类别的120+连接器：

| 类别 | 连接器 |
|----------|-----------|
| **AI与ML** | OpenAI、OpenAI Chatbot、Anthropic、Google AI、Google Gemini、AWS Bedrock |
| **分析** | Google Analytics、Grafana、Metabase、Mixpanel、PostHog、Segment、Splunk |
| **CMS** | WordPress、Contentful、Ghost、Medium、Webflow |
| **通信** | Slack、Gmail、Microsoft Teams、Telegram、Discord、Twilio、WhatsApp、AWS SES、SMTP、IMAP、POP3、Google Calendar、Calendly、Discourse、Matrix、Mattermost |
| **CRM与销售** | HubSpot、Salesforce、Pipedrive、Zoho CRM、Airtable、Monday.com |
| **数据处理** | Supabase、Scrapfly、Extract From File |
| **数据库** | Elasticsearch |
| **开发** | GitHub、GitLab、Bitbucket、Git、Jenkins、Travis CI、Netlify、n8n、npm |
| **电子商务** | Shopify、Stripe、PayPal、WooCommerce、Magento、Paddle、Gumroad |
| **财务** | QuickBooks、Plaid、Chargebee、Wise、Xero |
| **表单** | Google Forms、Jotform、Typeform |
| **营销** | Mailchimp、Klaviyo、SendGrid、Brevo、ActiveCampaign、Google Ads、Facebook Ads |
| **生产力** | Figma、Todoist、Spotify、Clockify、Toggl、Harvest |
| **项目管理** | Jira、Asana、Trello、Notion、Linear、ClickUp |
| **社交** | Twitter/X、Facebook、Instagram、TikTok、LinkedIn、Pinterest、Reddit |
| **存储** | Google Drive、Google Docs、Google Sheets、Dropbox、AWS S3、PostgreSQL、MySQL、MongoDB、Redis、Snowflake |
| **支持** | Zendesk、Intercom、Freshdesk、ServiceNow、PagerDuty、Sentry |
| **实用工具** | Bitly、DeepL、FTP、SSH、Execute Command |
| **视频** | YouTube、Zoom |

[查看所有连接器 &rarr;](docs/connectors.md)

## i18n

FluxTurn通过i18next支持17种语言：

- 英语、日语、中文、韩语、西班牙语、法语、德语、意大利语、俄语、葡萄牙语（巴西）、荷兰语、波兰语、乌克兰语、越南语、印度尼西亚语、阿拉伯语、印地语

想要添加新语言？请参阅[翻译指南](docs/contributing/translations.md)。

## 贡献

我们欢迎贡献！查看我们的[贡献指南](CONTRIBUTING.md)开始。

**贡献方式：**
- 通过[GitHub Issues](https://github.com/fluxturn/fluxturn/issues)报告错误或请求功能
- 提交错误修复或新功能的拉取请求
- 添加新连接器（参见[连接器开发指南](docs/guides/connector-development.md)）
- 改进文档
- 添加翻译

## 贡献者

感谢所有为FluxTurn做出贡献的优秀人士！🎉

<a href="https://github.com/fluxturn/fluxturn/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn" />
</a>

想在这里看到您的头像？查看我们的[贡献指南](CONTRIBUTING.md)并立即开始贡献！

## 社区

- [Discord](https://discord.gg/fluxturn) -- 与团队和社区聊天
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions) -- 提问、分享想法
- [Twitter/X](https://twitter.com/fluxturn) -- 关注获取更新

## 许可证

本项目采用[Apache License 2.0](LICENSE)许可。

## 致谢

使用[NestJS](https://nestjs.com)、[React](https://react.dev)、[ReactFlow](https://reactflow.dev)、[TypeScript](https://typescriptlang.org)和[i18next](https://i18next.com)构建。

---

<p align="center">
  <a href="https://fluxturn.com">网站</a> |
  <a href="https://github.com/fluxturn/fluxturn/wiki">文档</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>
