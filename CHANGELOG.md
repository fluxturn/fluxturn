# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Open-source release under Apache License 2.0
- Comprehensive CONTRIBUTING.md guide
- SECURITY.md with responsible disclosure policy
- CODE_OF_CONDUCT.md (Contributor Covenant v2.1)
- GitHub issue templates (bug reports, feature requests, connector requests)
- GitHub pull request template
- Root-level `docker-compose.yml` for one-command self-hosting
- CI workflow for pull request validation (lint, type-check, build)
- `.prettierrc` and `.editorconfig` for consistent code formatting
- NOTICE file with third-party attribution
- CHANGELOG.md following Keep a Changelog format

### Changed
- Replaced all hardcoded credentials with environment variable placeholders
- Migrated internal documentation to `docs/internal/`
- Updated `.gitignore` with comprehensive patterns
- Replaced legacy `fluxez` brand references with `fluxturn`
- Made hardcoded URLs configurable via environment variables
- Improved `.env.example` files with clear documentation and grouped sections

### Removed
- Proprietary license (replaced with Apache 2.0)
- Hardcoded API keys and secrets from example files
- Internal development artifacts from repository root
- `.DS_Store` files from version control

### Security
- Removed all real credentials from `.env.example` files
- Removed hardcoded JWT secret fallbacks from source code
- Added environment variable validation on startup
- Removed hardcoded server IPs from scripts

## [0.1.0] - 2025-01-01

### Added
- Initial workflow automation platform
- Visual workflow builder with drag-and-drop interface
- 80+ connector integrations (CRM, Marketing, Developer Tools, AI/ML, etc.)
- AI-powered workflow generation
- Real-time workflow execution with WebSocket updates
- Multi-language support (English, Japanese)
- Organization and project management
- Template library with pre-built workflows
- OAuth2 authentication for connected services
- PostgreSQL database with full-text search
- Redis-based job queue with BullMQ
- Qdrant vector database for RAG capabilities
