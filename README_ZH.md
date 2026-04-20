<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/Exploring the Future of Technology.png" alt="FluxTurn" width="600">
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
  <a href="https://github.com/fluxturn/fluxturn/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License"></a>
  <a href="https://github.com/fluxturn/fluxturn/stargazers"><img src="https://img.shields.io/github/stars/fluxturn/fluxturn?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/fluxturn/fluxturn/issues"><img src="https://img.shields.io/github/issues/fluxturn/fluxturn" alt="Issues"></a>
  <a href="https://github.com/fluxturn/fluxturn/pulls"><img src="https://img.shields.io/github/issues-pr/fluxturn/fluxturn" alt="Pull Requests"></a>
  <a href="https://discord.gg/tpJZ9J3q"><img src="https://img.shields.io/discord/YOUR_DISCORD_ID?label=Discord&logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center">
  <a href="https://github.com/fluxturn/fluxturn/wiki">文档</a> |
  <a href="#quick-start">快速开始</a> |
  <a href="https://discord.gg/tpJZ9J3q">Discord</a> |
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

FluxTurn是一个**生产就绪的开源工作流自动化平台**，弥合了想法与执行之间的差距。FluxTurn专为开发人员、DevOps团队和技术用户打造，结合了AI驱动的工作流生成能力和复杂的可视化构建器，帮助您在几秒钟内而不是几小时内自动化复杂流程。

与需要大量配置的传统自动化工具或牺牲灵活性的低代码平台不同，FluxTurn为您提供两全其美的解决方案：自然语言工作流生成的速度和基于可视化节点编辑器的精确性。

<p align="center">
  <img src="frontend/public/fluxturn_demo.png" alt="FluxTurn Visual Workflow Builder" width="800">
  <br>
  <em>FluxTurn的可视化工作流构建器，展示带有聊天记忆的AI代理工作流</em>
</p>

### 工作原理

1. **描述您的工作流** -- 用简单的中文告诉FluxTurn您想要自动化什么
2. **AI生成流程** -- 我们的AI代理分析您的需求并创建一个完整的工作流，配备正确的连接器
3. **可视化优化** -- 使用我们的ReactFlow驱动的画布微调生成的工作流
4. **部署与监控** -- 通过详细日志和基于WebSocket的监控实时执行工作流

### 核心功能

- **🤖 AI工作流生成** -- 用简单的中文描述您想要的，获得一个具有适当错误处理和最佳实践的可运行工作流
- **🎨 可视化工作流构建器** -- 由ReactFlow驱动的拖放界面，具有实时验证功能
- **🔌 120+预构建连接器** -- Slack、Gmail、Shopify、HubSpot、Jira、Stripe、OpenAI、Anthropic等
- **⚡ 实时执行** -- 通过详细日志、WebSocket更新和性能指标观察工作流运行
- **🏠 自托管与隐私优先** -- 使用Docker在您自己的基础设施上运行，完全控制数据
- **🌍 多语言支持** -- 支持17种语言，包括英语、日语、中文、韩语、西班牙语等
- **🔄 生产就绪** -- 使用NestJS、PostgreSQL、Redis和Qdrant构建，适用于企业级部署

## 我们解决的问题

### 自动化困境

现代团队面临一个关键挑战：**自动化至关重要但耗时**。在工具之间构建集成、处理错误和维护工作流需要大量工程资源。

**我们解决的常见痛点：**

- ❌ **手动集成地狱** -- 编写自定义脚本来连接不同的API需要数小时或数天
- ❌ **昂贵的SaaS锁定** -- 商业自动化工具按工作流执行或用户席位收费
- ❌ **有限的灵活性** -- 低代码平台易于上手，但难以针对复杂用例进行定制
- ❌ **供应商依赖** -- 仅限云的解决方案意味着您不拥有自己的自动化逻辑或数据
- ❌ **陡峭的学习曲线** -- 传统的工作流引擎需要深厚的技术知识才能设置

### FluxTurn的解决方案

✅ **AI驱动的速度** -- 在几秒钟而不是几小时内将想法转化为工作流
✅ **开源自由** -- 无供应商锁定，无按执行付费，完全控制您的代码
✅ **自托管隐私** -- 将敏感数据和工作流保存在您的基础设施上
✅ **开发者友好** -- 完整的API访问、可扩展的连接器系统、TypeScript代码库
✅ **可视化+代码** -- 从AI生成开始，进行可视化优化，如需要可导出为代码

## 为什么选择FluxTurn？（对比）

| 功能 | FluxTurn | Zapier/Make | n8n | Temporal | 自定义脚本 |
|---------|----------|-------------|-----|----------|----------------|
| **AI工作流生成** | ✅ 内置 | ❌ | ❌ | ❌ | ❌ |
| **可视化构建器** | ✅ ReactFlow | ✅ | ✅ | ❌ | ❌ |
| **自托管** | ✅ 免费 | ❌ | ✅ | ✅ | ✅ |
| **开源** | ✅ AGPL-3.0 | ❌ | ✅ Fair-code | ✅ MIT | N/A |
| **预构建连接器** | ✅ 120+ | ✅ 5000+ | ✅ 400+ | ❌ | ❌ |
| **实时监控** | ✅ WebSocket | ✅ | ✅ | ✅ | ❌ |
| **多语言UI** | ✅ 17种语言 | ✅ | ❌ | ❌ | N/A |
| **无按执行成本** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **生产就绪** | ✅ NestJS | ✅ | ✅ | ✅ | ⚠️ |
| **自然语言输入** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **向量搜索(Qdrant)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **学习曲线** | 🟢 低 | 🟢 低 | 🟡 中等 | 🔴 高 | 🔴 高 |

### FluxTurn的独特之处是什么？

1. **AI优先设计** -- 唯一具有原生AI工作流生成和自然语言理解的工作流平台
2. **现代技术栈** -- React 19、NestJS、PostgreSQL、Redis、Qdrant -- 为2025年及以后而构建
3. **开发者体验** -- 清晰的TypeScript代码库、可扩展的架构、全面的API
4. **真正的开源** -- AGPL-3.0许可证，没有"fair-code"限制，社区驱动的开发
5. **多模式输入** -- 自然语言或可视化构建器或API -- 选择适合您团队的方式

## 📊 项目活跃度与统计数据

FluxTurn是一个**积极维护**的项目，拥有不断增长的社区。以下是最新动态：

### GitHub活跃度

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

### 社区指标

| 指标 | 状态 | 详情 |
|--------|--------|---------|
| **总贡献者** | ![Contributors](https://img.shields.io/github/contributors/fluxturn/fluxturn?style=flat-square) | 不断增长的开发者社区 |
| **总提交数** | ![Commits](https://img.shields.io/github/commit-activity/t/fluxturn/fluxturn?style=flat-square) | 持续开发中 |
| **月度提交** | ![Commit Activity](https://img.shields.io/github/commit-activity/m/fluxturn/fluxturn?style=flat-square) | 积极维护 |
| **平均PR审查时间** | ~24-48小时 | 快速反馈循环 |
| **代码质量** | ![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen?style=flat-square) | TypeScript, ESLint, Prettier |
| **测试覆盖率** | ![Coverage](https://img.shields.io/badge/coverage-85%25-green?style=flat-square) | 经过充分测试的代码库 |
| **文档** | ![Docs](https://img.shields.io/badge/docs-comprehensive-blue?style=flat-square) | 完善的指南和API文档 |

### 语言与代码统计

<p align="left">
  <img src="https://img.shields.io/github/languages/top/fluxturn/fluxturn?style=for-the-badge&logo=typescript&color=blue" alt="Top Language">
  <img src="https://img.shields.io/github/languages/count/fluxturn/fluxturn?style=for-the-badge&color=purple" alt="Language Count">
  <img src="https://img.shields.io/github/repo-size/fluxturn/fluxturn?style=for-the-badge&color=orange" alt="Repo Size">
  <img src="https://img.shields.io/github/license/fluxturn/fluxturn?style=for-the-badge&color=green" alt="License">
</p>

### 近期活动亮点

- ✅ **120+连接器** 已发布并测试
- ✅ **17种语言** UI支持
- ✅ **1000+提交** 持续增长
- ✅ **活跃的Discord** 实时支持社区
- ✅ **每周发布** 新功能和错误修复
- ✅ **响应迅速的维护者** -- PR在1-2天内审查

### 为什么这些数字很重要

**快速PR审查** -- 我们珍惜您的时间。大多数拉取请求在24-48小时内获得初步反馈，而不是几周。

**积极开发** -- 定期提交意味着项目正在发展。新功能、错误修复和改进持续发布。

**不断增长的贡献者** -- 更多贡献者 = 更多视角、更好的代码质量和更快的功能开发。

**高测试覆盖率** -- 85%+的覆盖率意味着您可以自信地贡献，因为测试会捕获回归。

**完善的文档** -- 详细的文档意味着更少的困扰，更多的构建时间。

### 加入我们的活动！

想要在这里看到您的贡献吗？查看下面的[快速贡献指南](#-快速贡献指南)！

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

就这样！在`http://localhost:5185`访问应用，在`http://localhost:5005`访问API。

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

## 🚀 为什么要为FluxTurn做贡献？

FluxTurn不仅仅是另一个开源项目 -- 它是一个使用尖端技术的机会，同时构建能够解决全球开发者实际问题的产品。

### 您将获得什么

**📚 学习现代技术栈**
- **React 19** -- 包括服务器组件在内的最新React功能
- **NestJS** -- 企业使用的专业后端框架
- **LangChain** -- AI/ML集成和代理编排
- **向量数据库** -- 使用Qdrant进行语义搜索
- **ReactFlow** -- 构建交互式基于节点的UI
- **实时系统** -- WebSocket、Redis和事件驱动架构

**💼 构建您的作品集**
- 为真实公司使用的**生产就绪**平台做贡献
- 在GitHub个人资料上展示的功能工作
- 在我们的贡献者名人堂中获得认可
- 建立**工作流自动化**和**AI集成**方面的专业知识 -- 2026年非常有价值的技能

**🤝 加入不断增长的社区**
- 与来自世界各地的开发者建立联系
- 从经验丰富的维护者那里获得代码审查
- 学习软件架构的最佳实践
- 参与技术讨论和设计决策

**🎯 产生真正的影响**
- 您的代码将帮助成千上万的开发者自动化他们的工作流
- 看到您的功能在生产环境中被使用
- 影响AI驱动的自动化平台的发展方向

**⚡ 快速上手**
- 基于Docker的设置让您在**5分钟内**运行起来
- 文档完善的代码库，架构清晰
- 友好的维护者在24-48小时内回复PR
- 为新手标记的"good first issue"

## 🗺️ 项目路线图

这是我们正在构建的内容以及您可以贡献的地方。标有🆘的项目需要帮助！

### 2026年第二季度（当前季度）

**🤖 AI与智能**
- [ ] 🆘 **AI工作流优化** -- 自动建议工作流的性能改进
- [ ] **多代理工作流** -- 支持具有协调的并行AI代理
- [ ] 🆘 **自然语言工作流编辑** -- "向步骤3添加错误处理"更新工作流
- [ ] **智能连接器建议** -- AI根据工作流上下文推荐连接器

**🔌 连接器与集成**
- [ ] 🆘 **50+新连接器** -- Notion、Linear、Airtable、Make.com等
- [ ] **连接器市场** -- 社区贡献的连接器
- [ ] 🆘 **GraphQL支持** -- 为现代API添加GraphQL连接器
- [ ] **数据库连接器** -- Supabase、PlanetScale、Neon增强

**🎨 可视化构建器增强**
- [ ] 🆘 **工作流模板** -- 常见用例的预构建模板
- [ ] **条件分支UI** -- 可视化if/else流程构建器
- [ ] 🆘 **工作流版本控制** -- 跟踪和回滚工作流更改
- [ ] **协作编辑** -- 多个用户编辑同一个工作流

### 2026年第三季度

**⚡ 性能与规模**
- [ ] **分布式执行** -- 在多个工作节点上运行工作流
- [ ] 🆘 **工作流缓存** -- 缓存昂贵的操作
- [ ] **每个连接器的速率限制** -- 自动退避和重试
- [ ] **水平扩展** -- 使用Redis发布/订阅的多实例支持

**🔐 企业功能**
- [ ] **RBAC（基于角色的访问控制）** -- 用户权限和团队
- [ ] 🆘 **审计日志** -- 跟踪所有工作流更改和执行
- [ ] **SSO集成** -- SAML、OAuth2、LDAP支持
- [ ] **密钥管理** -- HashiCorp Vault集成

**📊 监控与可观察性**
- [ ] 🆘 **指标仪表板** -- 执行时间、成功率、错误跟踪
- [ ] **OpenTelemetry集成** -- 将跟踪导出到Jaeger、Datadog等
- [ ] **警报系统** -- 工作流失败时通知
- [ ] 🆘 **工作流分析** -- 使用模式和优化建议

### 2026年第四季度及以后

**🌐 平台扩展**
- [ ] **CLI工具** -- 从终端管理工作流
- [ ] 🆘 **工作流即代码** -- 在YAML/JSON中定义工作流
- [ ] **CI/CD集成** -- GitHub Actions、GitLab CI连接器
- [ ] **移动应用** -- iOS/Android工作流监控

**🧩 开发者体验**
- [ ] 🆘 **插件系统** -- 通过插件自定义节点和连接器
- [ ] **工作流测试框架** -- 工作流的单元测试
- [ ] **本地开发模式** -- 离线工作流开发
- [ ] **API模式验证** -- 自动验证连接器响应

### 如何影响路线图

💡 **有想法？** 开启[GitHub讨论](https://github.com/fluxturn/fluxturn/discussions)或加入我们的[Discord](https://discord.gg/tpJZ9J3q)

🗳️ **为功能投票** -- 为您关心的问题加星标以帮助我们确定优先级

🛠️ **想要构建未列出的内容？** -- 提出建议！我们喜欢社区驱动的功能

## 🎯 快速贡献指南

在**10分钟内**开始贡献：

### 步骤1：设置您的环境

```bash
# 在GitHub上Fork仓库，然后克隆您的fork
git clone https://github.com/YOUR_USERNAME/fluxturn.git
cd fluxturn

# 使用Docker启动（最简单的方法）
cp backend/.env.example backend/.env
docker compose up -d

# 访问应用
# 前端：http://localhost:5185
# 后端API：http://localhost:5005
```

**就这样！** 您正在本地运行FluxTurn。

### 步骤2：找到可以做的事情

根据您的经验水平选择：

**🟢 适合初学者**
- 📝 [修复拼写错误或改进文档](https://github.com/fluxturn/fluxturn/labels/documentation)
- 🌍 [添加翻译](https://github.com/fluxturn/fluxturn/labels/i18n) -- 我们支持17种语言
- 🐛 [修复简单的错误](https://github.com/fluxturn/fluxturn/labels/good%20first%20issue)
- ✨ [改进UI/UX](https://github.com/fluxturn/fluxturn/labels/ui%2Fux)

**🟡 中级**
- 🔌 [添加新连接器](https://github.com/fluxturn/fluxturn/labels/connector) -- 请参阅我们的[连接器开发指南](docs/guides/connector-development.md)
- 🎨 [增强可视化构建器](https://github.com/fluxturn/fluxturn/labels/visual-builder)
- 🧪 [编写测试](https://github.com/fluxturn/fluxturn/labels/tests)
- 🚀 [性能改进](https://github.com/fluxturn/fluxturn/labels/performance)

**🔴 高级**
- 🤖 [AI/ML功能](https://github.com/fluxturn/fluxturn/labels/ai)
- ⚙️ [核心引擎增强](https://github.com/fluxturn/fluxturn/labels/core)
- 🏗️ [架构改进](https://github.com/fluxturn/fluxturn/labels/architecture)
- 🔐 [安全功能](https://github.com/fluxturn/fluxturn/labels/security)

### 步骤3：进行更改

```bash
# 创建新分支
git checkout -b feature/your-feature-name

# 进行更改
# - 前端代码：/frontend/src
# - 后端代码：/backend/src
# - 连接器：/backend/src/modules/fluxturn/connectors

# 测试您的更改
npm run test

# 使用清晰的消息提交
git commit -m "feat: add new connector for Notion API"
```

### 步骤4：提交您的拉取请求

```bash
# 推送到您的fork
git push origin feature/your-feature-name

# 在GitHub上开启PR
# - 描述您更改了什么以及为什么
# - 链接到任何相关问题
# - 如果是UI更改，添加截图
```

**接下来会发生什么？**
- ✅ 自动化测试在您的PR上运行
- 👀 维护者审查您的代码（通常在24-48小时内）
- 💬 我们可能建议更改或改进
- 🎉 一旦获得批准，您的代码就会被合并！

### 贡献提示

✨ **从小处开始** -- 您的第一个PR不需要是一个巨大的功能
📖 **阅读代码** -- 浏览现有连接器或组件以获取示例
❓ **提出问题** -- 如果您遇到困难，加入我们的[Discord](https://discord.gg/tpJZ9J3q)
🧪 **编写测试** -- 有测试的PR会更快合并
📝 **记录您的代码** -- 为复杂逻辑添加注释

### 需要帮助？

- 💬 [Discord](https://discord.gg/tpJZ9J3q) -- 与维护者和贡献者聊天
- 📖 [贡献指南](CONTRIBUTING.md) -- 详细的贡献指南
- 🐛 [GitHub Issues](https://github.com/fluxturn/fluxturn/issues) -- 报告错误或请求功能
- 💡 [讨论](https://github.com/fluxturn/fluxturn/discussions) -- 提问、分享想法

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
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn&anon=1&max=100&columns=10" />
</a>

想在这里看到您的头像？查看我们的[贡献指南](CONTRIBUTING.md)并立即开始贡献！

## 💬 加入我们的社区

与开发者联系，获得帮助，并了解FluxTurn的最新发展！

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

### 在哪里找到我们

| 平台 | 用途 | 链接 |
|----------|---------|------|
| 💬 **Discord** | 实时聊天、获取帮助、讨论功能 | [加入服务器](https://discord.gg/tpJZ9J3q) |
| 💡 **GitHub Discussions** | 提问、分享想法、功能请求 | [开始讨论](https://github.com/fluxturn/fluxturn/discussions) |
| 🐦 **Twitter/X** | 产品更新、公告、提示 | [@fluxturn](https://twitter.com/fluxturn) |
| 📧 **Email** | 直接联系维护者 | support@fluxturn.com |
| 🌐 **Website** | 文档、指南、博客 | [fluxturn.com](https://fluxturn.com) |

### 社区准则

- 🤝 **相互尊重** -- 以尊重和善意对待每个人
- 💡 **分享知识** -- 帮助他人学习和成长
- 🐛 **报告问题** -- 发现了错误？在GitHub Issues上告诉我们
- 🎉 **庆祝胜利** -- 分享您的工作流程和成功故事
- 🌍 **全球思维** -- 我们是一个拥有17种以上语言的全球社区

## 许可证

本项目采用[GNU Affero General Public License v3.0](LICENSE)许可。

## 致谢

使用[NestJS](https://nestjs.com)、[React](https://react.dev)、[ReactFlow](https://reactflow.dev)、[TypeScript](https://typescriptlang.org)和[i18next](https://i18next.com)构建。

---

<p align="center">
  <a href="https://fluxturn.com">网站</a> |
  <a href="https://github.com/fluxturn/fluxturn/wiki">文档</a> |
  <a href="https://discord.gg/tpJZ9J3q">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>

---

<p align="center">
  <strong>由 <a href="https://fluxturn.com">fluxturn</a> 社区用❤️构建</strong>
</p>

<p align="center">
  如果您觉得这个项目有用，请考虑给它一个星标！⭐
  <br><br>
  <a href="https://github.com/fluxturn/fluxturn/stargazers">
    <img src="https://img.shields.io/github/stars/fluxturn/fluxturn?style=social" alt="Star on GitHub">
  </a>
</p>
