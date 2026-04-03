<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>オープンソースAI搭載ワークフロー自動化プラットフォーム</strong>
  </p>
  <p align="center">
    自然言語とビジュアルビルダーでワークフローを構築、自動化、オーケストレーション。
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
  <a href="https://docs.fluxturn.com">ドキュメント</a> |
  <a href="#quick-start">クイックスタート</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="CONTRIBUTING.md">コントリビュート</a>
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

## FluxTurnとは？

FluxTurnは、アプリの接続、プロセスの自動化、AI搭載ワークフローの構築を可能にするオープンソースのワークフロー自動化プラットフォームです。ビジュアルビルダーまたは自然言語で操作できます。

**主な機能：**

- **AI搭載ワークフロー生成** -- 日本語で説明するだけで、動作するワークフローを取得
- **ビジュアルワークフロービルダー** -- ReactFlowを活用したドラッグ＆ドロップインターフェース
- **80以上のコネクタ** -- Slack、Gmail、Shopify、HubSpot、Jira、Stripe、OpenAIなど
- **リアルタイム実行** -- 詳細なログとモニタリングでワークフローの実行を監視
- **セルフホスト** -- Dockerで独自のインフラストラクチャ上で実行

## クイックスタート

### Docker（推奨）

プロジェクトルートから以下のコマンドを実行：

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
cp backend/.env.example backend/.env
# データベース認証情報とJWTシークレットでbackend/.envを編集
docker compose up -d
```

これだけです！`http://localhost:5173`でアプリに、`http://localhost:5005`でAPIにアクセスできます。

### 手動セットアップ

**前提条件：** Node.js 18+、PostgreSQL 14+、Redis 7+

```bash
# クローン
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn

# バックエンド
cd backend
cp .env.example .env    # 設定で.envを編集
npm install
npm run start:dev

# フロントエンド（新しいターミナルで）
cd frontend
cp .env.example .env
npm install
npm run dev
```

## アーキテクチャ

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

**フロントエンド** (`/frontend`) -- React 19、Vite、TailwindCSS、ReactFlow、i18next、CodeMirror

**バックエンド** (`/backend`) -- NestJS、PostgreSQL（raw SQL）、Redis、Socket.IO、LangChain、80以上のコネクタ

## コネクタ

FluxTurnは以下のカテゴリで80以上のコネクタを提供：

| カテゴリ | コネクタ |
|----------|-----------|
| **コミュニケーション** | Slack、Gmail、Outlook、Telegram、Discord、Twilio、SendGrid、Microsoft Teams |
| **CRM＆セールス** | HubSpot、Salesforce、Pipedrive、Zoho CRM、Airtable |
| **Eコマース** | Shopify、Stripe、PayPal、WooCommerce、Paddle、Gumroad |
| **プロジェクト管理** | Jira、Asana、Trello、Notion、Linear、ClickUp |
| **ソーシャル** | Twitter/X、Facebook、Instagram、TikTok、LinkedIn、Pinterest |
| **AI＆ML** | OpenAI、Anthropic、Google AI、AWS Bedrock、Ollama、Replicate |
| **アナリティクス** | PostHog、Mixpanel、Segment、Grafana、Metabase、Splunk |
| **ストレージ** | Google Drive、Dropbox、AWS S3、PostgreSQL、Snowflake、Supabase |
| **サポート** | Zendesk、Intercom、ServiceNow、PagerDuty、Sentry |
| **ファイナンス** | QuickBooks、Plaid、Chargebee、Wise |
| **マーケティング** | Mailchimp、Klaviyo、Facebook Ads |
| **CMS** | WordPress、Contentful、Ghost、Medium、Webflow |

[すべてのコネクタを表示 &rarr;](docs/connectors.md)

## i18n

FluxTurnはi18nextを通じて17言語をサポート：

- 英語、日本語、中国語、韓国語、スペイン語、フランス語、ドイツ語、イタリア語、ロシア語、ポルトガル語（BR）、オランダ語、ポーランド語、ウクライナ語、ベトナム語、インドネシア語、アラビア語、ヒンディー語

新しい言語を追加したいですか？[翻訳ガイド](docs/contributing/translations.md)をご覧ください。

## コントリビュート

コントリビューションを歓迎します！[コントリビューションガイド](CONTRIBUTING.md)をご覧ください。

**コントリビュートの方法：**
- [GitHub Issues](https://github.com/fluxturn/fluxturn/issues)でバグを報告または機能をリクエスト
- バグ修正や新機能のプルリクエストを提出
- 新しいコネクタを追加（[コネクタ開発ガイド](docs/guides/connector-development.md)を参照）
- ドキュメントを改善
- 翻訳を追加

## コントリビューター

FluxTurnに貢献してくださったすべての素晴らしい方々に感謝します！🎉

<a href="https://github.com/fluxturn/fluxturn/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn" />
</a>

ここにあなたの顔を見たいですか？[コントリビューションガイド](CONTRIBUTING.md)をチェックして、今日から貢献を始めましょう！

## コミュニティ

- [Discord](https://discord.gg/fluxturn) -- チームやコミュニティとチャット
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions) -- 質問したり、アイデアを共有
- [Twitter/X](https://twitter.com/fluxturn) -- 最新情報をフォロー

## ライセンス

このプロジェクトは[Apache License 2.0](LICENSE)でライセンスされています。

## 謝辞

[NestJS](https://nestjs.com)、[React](https://react.dev)、[ReactFlow](https://reactflow.dev)、[TypeScript](https://typescriptlang.org)、[i18next](https://i18next.com)で構築されています。

---

<p align="center">
  <a href="https://fluxturn.com">ウェブサイト</a> |
  <a href="https://docs.fluxturn.com">ドキュメント</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>
