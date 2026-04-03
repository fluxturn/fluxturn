<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>Plataforma de automatizacion de flujos de trabajo impulsada por IA de codigo abierto</strong>
  </p>
  <p align="center">
    Construye, automatiza y orquesta flujos de trabajo con lenguaje natural y un editor visual.
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

## Que es FluxTurn?

FluxTurn es una plataforma de automatizacion de flujos de trabajo de codigo abierto que te permite conectar aplicaciones, automatizar procesos y construir flujos de trabajo impulsados por IA, todo a traves de un editor visual o lenguaje natural.

## Caracteristicas principales

- **Editor visual de flujos de trabajo** - Construye automatizaciones complejas con arrastrar y soltar
- **Generacion de flujos de trabajo con IA** - Describe lo que necesitas en lenguaje natural y la IA genera el flujo
- **Mas de 80 conectores** - CRM, marketing, IA/ML, herramientas de comunicacion y mas
- **Auto-hospedaje** - Despliega facilmente con `docker compose up`
- **Ejecucion en tiempo real** - Monitoreo en tiempo real con WebSocket
- **Codigo personalizado** - Soporte para ejecucion de JavaScript/Python

## Inicio rapido

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
docker compose --env-file .env.docker up
```

Frontend: http://localhost:5185
API Backend: http://localhost:5005

## Documentacion

Para mas detalles, consulta el [README en ingles](./README.md).

## Comunidad

- [Discord](https://discord.gg/fluxturn)
- [GitHub Issues](https://github.com/fluxturn/fluxturn/issues)
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions)

## Licencia

[Apache License 2.0](LICENSE)
