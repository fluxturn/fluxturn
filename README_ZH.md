<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>开源AI驱动的工作流自动化平台</strong>
  </p>
  <p align="center">
    通过自然语言和可视化编辑器构建、自动化和编排工作流。
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

## FluxTurn是什么？

FluxTurn是一个开源的工作流自动化平台，让您能够连接应用、自动化流程，并构建AI驱动的工作流——所有这一切都可以通过可视化编辑器或自然语言来完成。

## 核心功能

- **可视化工作流编辑器** - 拖拽式界面构建复杂自动化
- **AI驱动的工作流生成** - 用自然语言描述需求，AI自动生成工作流
- **80+连接器** - CRM、营销、AI/ML、通信工具等
- **自托管** - 使用 `docker compose up` 轻松部署
- **实时执行** - WebSocket实时监控
- **自定义代码** - 支持JavaScript/Python代码执行

## 快速开始

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
docker compose --env-file .env.docker up
```

前端: http://localhost:5185
后端API: http://localhost:5005

## 文档

详细信息请参阅[英文版README](./README.md)。

## 社区

- [Discord](https://discord.gg/fluxturn)
- [GitHub Issues](https://github.com/fluxturn/fluxturn/issues)
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions)

## 许可证

[Apache License 2.0](LICENSE)
