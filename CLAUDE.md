# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartPM is an AI-enhanced project management system. It is a **modular monolith** — a single deployable backend organized by business domain, paired with a Vue 3 SPA frontend.

## Commands

### Backend (`cd backend`)

```bash
npm run start:dev        # Hot-reload dev server (port 3000)
npm run build            # Compile TypeScript → dist/
npm run test             # Jest unit tests
npm run test:watch       # Jest in watch mode
npm run test:cov         # Coverage report
npm run test:e2e         # E2E tests
npm run lint             # ESLint with auto-fix
npm run format           # Prettier

# Database migrations (TypeORM)
npm run migration:run       # Apply pending migrations
npm run migration:generate  # Generate migration from entity changes
npm run migration:revert    # Revert last migration
npm run migration:create    # Create empty migration file
```

### Frontend (`cd frontend`)

```bash
npm run dev      # Vite dev server (port 11011)
npm run build    # Production build
npm run preview  # Preview production build
```

### Infrastructure

```bash
docker-compose -f docker-compose.dev.yml up -d   # Start PostgreSQL, Redis, NSQ, MinIO
```

## Architecture

```
frontend/   Vue 3 + Vite + Pinia + vxe-table SPA
backend/    NestJS API (port 3000, prefix /api/v1)
docs/       Architecture, DB schema, API spec, AI module design
```

### Backend Module Layout

```
backend/src/
├── modules/          # Business domain modules
│   ├── auth/         # JWT auth (register, login, refresh)
│   ├── user/         # User profile & preferences
│   ├── workspace/    # Workspace CRUD + members
│   ├── project/      # Project CRUD + members
│   ├── task/         # Tasks, subtasks, tags
│   ├── comment/      # Comments + @mentions
│   ├── file/         # Upload + attachments (S3-compatible)
│   ├── notification/ # Notification list + read status
│   ├── activity/     # Activity log (NSQ consumer)
│   └── ai/           # AI features (Anthropic Claude API)
└── infra/            # Infrastructure adapters
    ├── database/     # TypeORM + PostgreSQL + migrations
    ├── redis/        # Session cache
    ├── nsq/          # Async message queue
    ├── storage/      # MinIO/RustFS S3 adapter
    └── websocket/    # Socket.io gateway (real-time)
```

### Data Flow

- **Sync**: HTTP REST → NestJS controller → service → TypeORM → PostgreSQL
- **Async**: Service publishes to NSQ → consumer (activity, notifications, AI tasks)
- **Real-time**: Socket.io gateway pushes updates to connected clients
- **AI**: `ai` module calls Anthropic Claude API for task generation, requirement splitting, daily summaries

### Key Design Decisions

- **Soft deletes**: Core entities use `deleted_at` (TypeORM soft-delete pattern)
- **Response unwrapping**: Axios interceptor in frontend unwraps the standard `{ data, code, message }` envelope — all API calls receive the inner `data` directly
- **AI model**: Configured via `LLM_MODEL` env var, defaults to `claude-sonnet-4-6`

## Environment Setup

Copy `backend/.env.example` to `backend/.env`. Key variables:

| Variable | Purpose |
|---|---|
| `DB_*` | PostgreSQL connection |
| `REDIS_*` | Redis connection |
| `JWT_SECRET` | Must change in production |
| `NSQ_HOST/PORT` | NSQ message queue |
| `STORAGE_ENDPOINT` | MinIO/RustFS S3 endpoint |
| `LLM_API_KEY` | Anthropic API key |
| `LLM_MODEL` | Claude model ID |

## Documentation

`docs/` contains the authoritative design docs — read these before making structural changes:

- `01-architecture.md` — system design and tech stack rationale
- `02-database.md` — ER diagram and schema decisions
- `03-api.md` — full API endpoint spec
- `04-nsq-design.md` — async message patterns
- `05-ai-module.md` — AI integration design
