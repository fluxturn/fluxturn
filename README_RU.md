<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>Платформа автоматизации рабочих процессов с открытым исходным кодом на базе ИИ</strong>
  </p>
  <p align="center">
    Создавайте, автоматизируйте и управляйте рабочими процессами с помощью естественного языка и визуального редактора.
  </p>
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
  <a href="./README_RU.md">Русский</a>
</p>

---

## Что такое FluxTurn?

FluxTurn -- это платформа автоматизации рабочих процессов с открытым исходным кодом, которая позволяет подключать приложения, автоматизировать процессы и создавать рабочие процессы на базе ИИ -- всё через визуальный редактор или естественный язык.

## Основные возможности

- **Визуальный редактор** -- создавайте сложные автоматизации перетаскиванием
- **Генерация процессов с ИИ** -- опишите задачу на естественном языке, ИИ создаст рабочий процесс
- **80+ коннекторов** -- CRM, маркетинг, ИИ/ML, инструменты коммуникации и другие
- **Self-hosting** -- простой деплой через `docker compose up`
- **Выполнение в реальном времени** -- мониторинг через WebSocket
- **Пользовательский код** -- поддержка JavaScript/Python

## Быстрый старт

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
docker compose --env-file .env.docker up
```

Фронтенд: http://localhost:5185
API бэкенда: http://localhost:5005

## Документация

Подробности смотрите в [README на английском](./README.md).

## Сообщество

- [Discord](https://discord.gg/fluxturn)
- [GitHub Issues](https://github.com/fluxturn/fluxturn/issues)
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions)

## Лицензия

[Apache License 2.0](LICENSE)
