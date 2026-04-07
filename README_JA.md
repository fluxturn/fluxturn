<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/Exploring the Future of Technology.png" alt="FluxTurn" width="600">
  </a>
</p>

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
  <a href="https://github.com/fluxturn/fluxturn/wiki">ドキュメント</a> |
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

FluxTurnは、アイデアと実行のギャップを埋める**本番環境対応のオープンソースワークフロー自動化プラットフォーム**です。開発者、DevOpsチーム、技術ユーザー向けに構築されたFluxTurnは、AI駆動のワークフロー生成と高度なビジュアルビルダーの力を組み合わせることで、数時間ではなく数秒で複雑なプロセスを自動化できます。

広範な設定が必要な従来の自動化ツールや、柔軟性を犠牲にするローコードプラットフォームとは異なり、FluxTurnは両方の長所を提供します：自然言語によるワークフロー生成の速度と、ビジュアルノードベースエディタの精度です。

### 動作の仕組み

1. **ワークフローを記述** -- FluxTurnに自動化したい内容を自然な日本語で伝えます
2. **AIがフローを生成** -- AIエージェントが要件を分析し、適切なコネクタを使用して完全なワークフローを作成します
3. **ビジュアル調整** -- ReactFlowを活用したキャンバスで生成されたワークフローを微調整します
4. **デプロイ＆モニター** -- 詳細なログとWebSocketベースのモニタリングでワークフローをリアルタイムで実行します

### 主な機能

- **🤖 AIワークフロー生成** -- 自然な日本語で記述するだけで、適切なエラーハンドリングとベストプラクティスを備えた動作するワークフローを取得
- **🎨 ビジュアルワークフロービルダー** -- ReactFlowを活用したリアルタイム検証付きドラッグ＆ドロップインターフェース
- **🔌 120以上のプリビルトコネクタ** -- Slack、Gmail、Shopify、HubSpot、Jira、Stripe、OpenAI、Anthropicなど多数
- **⚡ リアルタイム実行** -- 詳細なログ、WebSocket更新、パフォーマンスメトリクスでワークフローの実行を監視
- **🏠 セルフホスト＆プライバシー優先** -- Dockerで独自のインフラストラクチャ上で実行、完全なデータ制御
- **🌍 多言語サポート** -- 英語、日本語、中国語、韓国語、スペイン語など17言語に対応
- **🔄 本番環境対応** -- NestJS、PostgreSQL、Redis、Qdrantで構築され、エンタープライズスケールのデプロイメントに対応

## 解決する問題

### 自動化のジレンマ

現代のチームは重大な課題に直面しています：**自動化は不可欠ですが、時間がかかります**。ツール間の統合を構築し、エラーを処理し、ワークフローを維持するには、多大なエンジニアリングリソースが必要です。

**私たちが対処する一般的な問題点：**

- ❌ **手動統合の地獄** -- 異なるAPIを接続するカスタムスクリプトの作成には数時間から数日かかります
- ❌ **高額なSaaSロックイン** -- 商用自動化ツールはワークフロー実行ごとまたはユーザーシートごとに課金します
- ❌ **限定的な柔軟性** -- ローコードプラットフォームは開始は簡単ですが、複雑なユースケースに対するカスタマイズが困難です
- ❌ **ベンダー依存** -- クラウド専用ソリューションは、自動化ロジックやデータを所有できないことを意味します
- ❌ **急な学習曲線** -- 従来のワークフローエンジンは、セットアップに深い技術知識が必要です

### FluxTurnのソリューション

✅ **AI駆動の速度** -- アイデアを数時間ではなく数秒で動作するワークフローに変換
✅ **オープンソースの自由** -- ベンダーロックインなし、実行ごとの料金なし、コードの完全な制御
✅ **セルフホストのプライバシー** -- 機密データとワークフローを独自のインフラストラクチャに保管
✅ **開発者フレンドリー** -- 完全なAPIアクセス、拡張可能なコネクタシステム、TypeScriptコードベース
✅ **ビジュアル＋コード** -- AI生成から始め、ビジュアルで調整し、必要に応じてコードとしてエクスポート

## FluxTurnを選ぶ理由？（比較）

| 機能 | FluxTurn | Zapier/Make | n8n | Temporal | カスタムスクリプト |
|---------|----------|-------------|-----|----------|----------------|
| **AIワークフロー生成** | ✅ ビルトイン | ❌ | ❌ | ❌ | ❌ |
| **ビジュアルビルダー** | ✅ ReactFlow | ✅ | ✅ | ❌ | ❌ |
| **セルフホスト** | ✅ 無料 | ❌ | ✅ | ✅ | ✅ |
| **オープンソース** | ✅ Apache 2.0 | ❌ | ✅ Fair-code | ✅ MIT | N/A |
| **プリビルトコネクタ** | ✅ 120以上 | ✅ 5000以上 | ✅ 400以上 | ❌ | ❌ |
| **リアルタイムモニタリング** | ✅ WebSocket | ✅ | ✅ | ✅ | ❌ |
| **多言語UI** | ✅ 17言語 | ✅ | ❌ | ❌ | N/A |
| **実行ごとのコストなし** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **本番環境対応** | ✅ NestJS | ✅ | ✅ | ✅ | ⚠️ |
| **自然言語入力** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **ベクトル検索（Qdrant）** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **学習曲線** | 🟢 低 | 🟢 低 | 🟡 中 | 🔴 高 | 🔴 高 |

### FluxTurnの独自性

1. **AI優先設計** -- ネイティブなAIワークフロー生成と自然言語理解を備えた唯一のワークフロープラットフォーム
2. **モダンな技術スタック** -- React 19、NestJS、PostgreSQL、Redis、Qdrant -- 2025年以降に向けて構築
3. **開発者体験** -- クリーンなTypeScriptコードベース、拡張可能なアーキテクチャ、包括的なAPI
4. **真のオープンソース** -- Apache 2.0ライセンス、「fair-code」制限なし、コミュニティ主導の開発
5. **マルチモーダル入力** -- 自然言語またはビジュアルビルダーまたはAPI -- チームに最適な方法を選択

## 📊 Project Activity & Statistics

FluxTurn is an **actively maintained** project with a growing community. Here's what's happening:

### GitHub Activity

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

### Community Metrics

| Metric | Status | Details |
|--------|--------|---------|
| **Total Contributors** | ![Contributors](https://img.shields.io/github/contributors/fluxturn/fluxturn?style=flat-square) | Growing community of developers |
| **Total Commits** | ![Commits](https://img.shields.io/github/commit-activity/t/fluxturn/fluxturn?style=flat-square) | Continuous development |
| **Monthly Commits** | ![Commit Activity](https://img.shields.io/github/commit-activity/m/fluxturn/fluxturn?style=flat-square) | Active maintenance |
| **Average PR Review Time** | ~24-48 hours | Fast feedback loop |
| **Code Quality** | ![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen?style=flat-square) | TypeScript, ESLint, Prettier |
| **Test Coverage** | ![Coverage](https://img.shields.io/badge/coverage-85%25-green?style=flat-square) | Well-tested codebase |
| **Documentation** | ![Docs](https://img.shields.io/badge/docs-comprehensive-blue?style=flat-square) | Extensive guides & API docs |

### Language & Code Statistics

<p align="left">
  <img src="https://img.shields.io/github/languages/top/fluxturn/fluxturn?style=for-the-badge&logo=typescript&color=blue" alt="Top Language">
  <img src="https://img.shields.io/github/languages/count/fluxturn/fluxturn?style=for-the-badge&color=purple" alt="Language Count">
  <img src="https://img.shields.io/github/repo-size/fluxturn/fluxturn?style=for-the-badge&color=orange" alt="Repo Size">
  <img src="https://img.shields.io/github/license/fluxturn/fluxturn?style=for-the-badge&color=green" alt="License">
</p>

### Recent Activity Highlights

- ✅ **120+ Connectors** shipped and tested
- ✅ **17 Languages** supported in the UI
- ✅ **1000+ Commits** and counting
- ✅ **Active Discord** community with real-time support
- ✅ **Weekly Releases** with new features and bug fixes
- ✅ **Responsive Maintainers** -- PRs reviewed within 1-2 days

### Why These Numbers Matter

**Fast PR Reviews** -- We value your time. Most pull requests get initial feedback within 24-48 hours, not weeks.

**Active Development** -- Regular commits mean the project is evolving. New features, bug fixes, and improvements ship continuously.

**Growing Contributors** -- More contributors = more perspectives, better code quality, and faster feature development.

**High Test Coverage** -- 85%+ coverage means you can contribute confidently knowing tests will catch regressions.

**Comprehensive Docs** -- Detailed documentation means less time struggling, more time building.

### Join the Activity!

Want to see your contributions here? Check out our [Quick Contribution Guide](#-クイック貢献ガイド) below!

## 🚀 FluxTurnに貢献する理由

FluxTurnは単なるもう一つのオープンソースプロジェクトではありません -- 世界中の開発者にとって実際の問題を解決するものを構築しながら、最先端の技術を扱う機会です。

### 得られるもの

**📚 モダンな技術スタックを学ぶ**
- **React 19** -- Server Componentsを含む最新のReact機能
- **NestJS** -- 企業で使用されるプロフェッショナルなバックエンドフレームワーク
- **LangChain** -- AI/ML統合とエージェントオーケストレーション
- **ベクトルデータベース** -- セマンティック検索のためにQdrantを使った作業
- **ReactFlow** -- インタラクティブなノードベースUIの構築
- **リアルタイムシステム** -- WebSocket、Redis、イベント駆動アーキテクチャ

**💼 ポートフォリオを構築**
- 実際の企業で使用される**本番環境対応**プラットフォームに貢献
- GitHubプロファイルに表示される機能に取り組む
- コントリビューター殿堂で認知を得る
- **ワークフロー自動化**と**AI統合**の専門知識を構築 -- 2026年に高く評価されるスキル

**🤝 成長するコミュニティに参加**
- 世界中の開発者とつながる
- 経験豊富なメンテナからコードレビューを受ける
- ソフトウェアアーキテクチャのベストプラクティスを学ぶ
- 技術的な議論や設計決定に参加

**🎯 実際の影響を与える**
- あなたのコードは何千人もの開発者がワークフローを自動化するのを助けます
- 本番環境で使用される機能を見る
- AI駆動の自動化プラットフォームの方向性に影響を与える

**⚡ クイックオンボーディング**
- Dockerベースのセットアップで**5分以内**に実行可能
- 明確なアーキテクチャを持つよく文書化されたコードベース
- 24〜48時間以内にPRに応答するフレンドリーなメンテナ
- 初心者向けの「Good first issue」ラベル

## 🗺️ プロジェクトロードマップ

私たちが構築しているものと、貢献できる場所を示します。🆘とマークされた項目はヘルプが必要です！

### Q2 2026（現在の四半期）

**🤖 AI＆インテリジェンス**
- [ ] 🆘 **AIワークフロー最適化** -- ワークフローのパフォーマンス改善を自動提案
- [ ] **マルチエージェントワークフロー** -- 調整を伴う並列AIエージェントのサポート
- [ ] 🆘 **自然言語ワークフロー編集** -- 「ステップ3にエラーハンドリングを追加」でワークフローを更新
- [ ] **スマートコネクタ提案** -- AIがワークフローのコンテキストに基づいてコネクタを推奨

**🔌 コネクタ＆統合**
- [ ] 🆘 **50以上の新しいコネクタ** -- Notion、Linear、Airtable、Make.comなど
- [ ] **コネクタマーケットプレイス** -- コミュニティ貢献のコネクタ
- [ ] 🆘 **GraphQLサポート** -- モダンAPIのためのGraphQLコネクタを追加
- [ ] **データベースコネクタ** -- Supabase、PlanetScale、Neonの機能強化

**🎨 ビジュアルビルダーの強化**
- [ ] 🆘 **ワークフローテンプレート** -- 一般的なユースケース向けのプリビルドテンプレート
- [ ] **条件分岐UI** -- ビジュアルif/elseフロービルダー
- [ ] 🆘 **ワークフローバージョニング** -- ワークフローの変更を追跡してロールバック
- [ ] **共同編集** -- 複数のユーザーが同じワークフローを編集

### Q3 2026

**⚡ パフォーマンス＆スケール**
- [ ] **分散実行** -- 複数のワーカーでワークフローを実行
- [ ] 🆘 **ワークフローキャッシング** -- 高コストな操作をキャッシュ
- [ ] **コネクタごとのレート制限** -- 自動バックオフとリトライ
- [ ] **水平スケーリング** -- Redis pub/subを使用したマルチインスタンスサポート

**🔐 エンタープライズ機能**
- [ ] **RBAC（ロールベースアクセス制御）** -- ユーザー権限とチーム
- [ ] 🆘 **監査ログ** -- すべてのワークフロー変更と実行を追跡
- [ ] **SSO統合** -- SAML、OAuth2、LDAPサポート
- [ ] **シークレット管理** -- HashiCorp Vault統合

**📊 モニタリング＆可観測性**
- [ ] 🆘 **メトリクスダッシュボード** -- 実行時間、成功率、エラー追跡
- [ ] **OpenTelemetry統合** -- Jaeger、Datadogなどにトレースをエクスポート
- [ ] **アラートシステム** -- ワークフロー失敗時の通知
- [ ] 🆘 **ワークフロー分析** -- 使用パターンと最適化推奨

### Q4 2026以降

**🌐 プラットフォーム拡張**
- [ ] **CLIツール** -- ターミナルからワークフローを管理
- [ ] 🆘 **Workflow as Code** -- YAML/JSONでワークフローを定義
- [ ] **CI/CD統合** -- GitHub Actions、GitLab CIコネクタ
- [ ] **モバイルアプリ** -- iOS/Androidワークフローモニタリング

**🧩 開発者体験**
- [ ] 🆘 **プラグインシステム** -- プラグインを介したカスタムノードとコネクタ
- [ ] **ワークフローテストフレームワーク** -- ワークフローのユニットテスト
- [ ] **ローカル開発モード** -- オフラインワークフロー開発
- [ ] **APIスキーマ検証** -- コネクタレスポンスの自動検証

### ロードマップに影響を与える方法

💡 **アイデアがありますか？** [GitHub Discussion](https://github.com/fluxturn/fluxturn/discussions)を開くか、[Discord](https://discord.gg/fluxturn)に参加してください

🗳️ **機能に投票** -- 気になるIssueにスターを付けて優先順位付けを支援

🛠️ **リストにないものを構築したいですか？** -- 提案してください！コミュニティ主導の機能を歓迎します

## 🎯 クイック貢献ガイド

**10分以内**で貢献を始めましょう：

### ステップ1：環境をセットアップ

```bash
# GitHubでリポジトリをフォークし、フォークをクローン
git clone https://github.com/YOUR_USERNAME/fluxturn.git
cd fluxturn

# Dockerで始める（最も簡単な方法）
cp backend/.env.example backend/.env
docker compose up -d

# アプリにアクセス
# フロントエンド：http://localhost:5185
# バックエンドAPI：http://localhost:5005
```

**これだけです！** FluxTurnがローカルで実行されています。

### ステップ2：作業するものを見つける

経験レベルに基づいて選択：

**🟢 初心者向け**
- 📝 [タイポの修正またはドキュメントの改善](https://github.com/fluxturn/fluxturn/labels/documentation)
- 🌍 [翻訳の追加](https://github.com/fluxturn/fluxturn/labels/i18n) -- 17言語をサポート
- 🐛 [簡単なバグの修正](https://github.com/fluxturn/fluxturn/labels/good%20first%20issue)
- ✨ [UI/UXの改善](https://github.com/fluxturn/fluxturn/labels/ui%2Fux)

**🟡 中級者向け**
- 🔌 [新しいコネクタの追加](https://github.com/fluxturn/fluxturn/labels/connector) -- [コネクタ開発ガイド](docs/guides/connector-development.md)を参照
- 🎨 [ビジュアルビルダーの強化](https://github.com/fluxturn/fluxturn/labels/visual-builder)
- 🧪 [テストの作成](https://github.com/fluxturn/fluxturn/labels/tests)
- 🚀 [パフォーマンス改善](https://github.com/fluxturn/fluxturn/labels/performance)

**🔴 上級者向け**
- 🤖 [AI/ML機能](https://github.com/fluxturn/fluxturn/labels/ai)
- ⚙️ [コアエンジンの強化](https://github.com/fluxturn/fluxturn/labels/core)
- 🏗️ [アーキテクチャの改善](https://github.com/fluxturn/fluxturn/labels/architecture)
- 🔐 [セキュリティ機能](https://github.com/fluxturn/fluxturn/labels/security)

### ステップ3：変更を行う

```bash
# 新しいブランチを作成
git checkout -b feature/your-feature-name

# 変更を行う
# - フロントエンドコード：/frontend/src
# - バックエンドコード：/backend/src
# - コネクタ：/backend/src/modules/fluxturn/connectors

# 変更をテスト
npm run test

# 明確なメッセージでコミット
git commit -m "feat: add new connector for Notion API"
```

### ステップ4：プルリクエストを提出

```bash
# フォークにプッシュ
git push origin feature/your-feature-name

# GitHubでPRを開く
# - 何を変更したか、なぜ変更したかを説明
# - 関連するIssueにリンク
# - UI変更の場合はスクリーンショットを追加
```

**次に起こること：**
- ✅ 自動テストがPRで実行されます
- 👀 メンテナがコードをレビューします（通常24〜48時間以内）
- 💬 変更や改善を提案する場合があります
- 🎉 承認されると、コードがマージされます！

### 貢献のヒント

✨ **小さく始める** -- 最初のPRは大きな機能である必要はありません
📖 **コードを読む** -- 既存のコネクタやコンポーネントを例として参照
❓ **質問する** -- 困ったら[Discord](https://discord.gg/fluxturn)に参加
🧪 **テストを書く** -- テスト付きのPRはより早くマージされます
📝 **コードを文書化** -- 複雑なロジックにはコメントを追加

### ヘルプが必要ですか？

- 💬 [Discord](https://discord.gg/fluxturn) -- メンテナやコントリビューターとチャット
- 📖 [貢献ガイド](CONTRIBUTING.md) -- 詳細な貢献ガイドライン
- 🐛 [GitHub Issues](https://github.com/fluxturn/fluxturn/issues) -- バグを報告または機能をリクエスト
- 💡 [Discussions](https://github.com/fluxturn/fluxturn/discussions) -- 質問したり、アイデアを共有

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

これだけです！`http://localhost:5185`でアプリに、`http://localhost:5005`でAPIにアクセスできます。

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

**フロントエンド** (`/frontend`) -- React 19、Vite、TailwindCSS、ReactFlow、i18next、CodeMirror

**バックエンド** (`/backend`) -- NestJS、PostgreSQL（raw SQL）、Redis、Socket.IO、LangChain、120以上のコネクタ

## コネクタ

FluxTurnは以下のカテゴリで120以上のコネクタを提供：

| カテゴリ | コネクタ |
|----------|-----------|
| **AI＆ML** | OpenAI、OpenAI Chatbot、Anthropic、Google AI、Google Gemini、AWS Bedrock |
| **アナリティクス** | Google Analytics、Grafana、Metabase、Mixpanel、PostHog、Segment、Splunk |
| **CMS** | WordPress、Contentful、Ghost、Medium、Webflow |
| **コミュニケーション** | Slack、Gmail、Microsoft Teams、Telegram、Discord、Twilio、WhatsApp、AWS SES、SMTP、IMAP、POP3、Google Calendar、Calendly、Discourse、Matrix、Mattermost |
| **CRM＆セールス** | HubSpot、Salesforce、Pipedrive、Zoho CRM、Airtable、Monday.com |
| **データ処理** | Supabase、Scrapfly、Extract From File |
| **データベース** | Elasticsearch |
| **開発** | GitHub、GitLab、Bitbucket、Git、Jenkins、Travis CI、Netlify、n8n、npm |
| **Eコマース** | Shopify、Stripe、PayPal、WooCommerce、Magento、Paddle、Gumroad |
| **ファイナンス** | QuickBooks、Plaid、Chargebee、Wise、Xero |
| **フォーム** | Google Forms、Jotform、Typeform |
| **マーケティング** | Mailchimp、Klaviyo、SendGrid、Brevo、ActiveCampaign、Google Ads、Facebook Ads |
| **生産性** | Figma、Todoist、Spotify、Clockify、Toggl、Harvest |
| **プロジェクト管理** | Jira、Asana、Trello、Notion、Linear、ClickUp |
| **ソーシャル** | Twitter/X、Facebook、Instagram、TikTok、LinkedIn、Pinterest、Reddit |
| **ストレージ** | Google Drive、Google Docs、Google Sheets、Dropbox、AWS S3、PostgreSQL、MySQL、MongoDB、Redis、Snowflake |
| **サポート** | Zendesk、Intercom、Freshdesk、ServiceNow、PagerDuty、Sentry |
| **ユーティリティ** | Bitly、DeepL、FTP、SSH、Execute Command |
| **ビデオ** | YouTube、Zoom |

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
  <a href="https://github.com/fluxturn/fluxturn/wiki">ドキュメント</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>
