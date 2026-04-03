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
  <a href="./README.md">English</a> |
  <a href="./README_JA.md">日本語</a> |
  <a href="./README_ZH.md">中文</a> |
  <a href="./README_KO.md">한국어</a> |
  <a href="./README_ES.md">Español</a> |
  <a href="./README_FR.md">Français</a> |
  <a href="./README_DE.md">Deutsch</a>
</p>

---

## FluxTurnとは？

FluxTurnは、アプリの接続、プロセスの自動化、AI搭載ワークフローの構築を可能にするオープンソースのワークフロー自動化プラットフォームです。ビジュアルビルダーまたは自然言語で操作できます。

## 主な機能

- **ビジュアルワークフロービルダー** - ドラッグ＆ドロップで複雑な自動化を構築
- **AI搭載ワークフロー生成** - 自然言語でワークフローを説明するだけで自動生成
- **80以上のコネクタ** - CRM、マーケティング、AI/ML、コミュニケーションツールなど
- **セルフホスト対応** - `docker compose up` で簡単にデプロイ
- **リアルタイム実行** - WebSocketによるリアルタイムモニタリング
- **カスタムコード** - JavaScript/Pythonの実行をサポート

## クイックスタート

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
docker compose --env-file .env.docker up
```

フロントエンド: http://localhost:5185
バックエンドAPI: http://localhost:5005

## ドキュメント

詳細は[英語版README](./README.md)をご覧ください。

## コミュニティ

- [Discord](https://discord.gg/fluxturn)
- [GitHub Issues](https://github.com/fluxturn/fluxturn/issues)
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions)

## ライセンス

[Apache License 2.0](LICENSE)
