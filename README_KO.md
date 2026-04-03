<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>오픈소스 AI 기반 워크플로우 자동화 플랫폼</strong>
  </p>
  <p align="center">
    자연어와 비주얼 빌더로 워크플로우를 구축, 자동화, 오케스트레이션하세요.
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

## FluxTurn이란?

FluxTurn은 앱 연결, 프로세스 자동화, AI 기반 워크플로우 구축을 가능하게 하는 오픈소스 워크플로우 자동화 플랫폼입니다. 비주얼 빌더 또는 자연어로 모든 작업을 수행할 수 있습니다.

## 주요 기능

- **비주얼 워크플로우 빌더** - 드래그 앤 드롭으로 복잡한 자동화 구축
- **AI 기반 워크플로우 생성** - 자연어로 설명하면 AI가 워크플로우를 자동 생성
- **80개 이상의 커넥터** - CRM, 마케팅, AI/ML, 커뮤니케이션 도구 등
- **셀프 호스팅** - `docker compose up`으로 간편 배포
- **실시간 실행** - WebSocket 기반 실시간 모니터링
- **커스텀 코드** - JavaScript/Python 코드 실행 지원

## 빠른 시작

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
docker compose --env-file .env.docker up
```

프론트엔드: http://localhost:5185
백엔드 API: http://localhost:5005

## 문서

자세한 내용은 [영문 README](./README.md)를 참조하세요.

## 커뮤니티

- [Discord](https://discord.gg/fluxturn)
- [GitHub Issues](https://github.com/fluxturn/fluxturn/issues)
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions)

## 라이선스

[Apache License 2.0](LICENSE)
