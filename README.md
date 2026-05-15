# FlowCraft

Visual drag-and-drop AI Agent workflow builder. TypeScript full-stack.

## Quick Start

```bash
# 1. Prerequisites: Node.js 20+, pnpm 9+, Docker

# 2. Clone and install
git clone <repo-url> && cd flowcraft
pnpm install

# 3. Start PostgreSQL
docker compose up -d postgres

# 4. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 5. Push database schema
pnpm db:push

# 6. Start development servers
pnpm dev
```

Open http://localhost:5173

## Architecture

```
Frontend (Vite + React Flow)  →  Backend (Hono + DAG Engine)  →  PostgreSQL
         SSE (EventEmitter)                    Drizzle ORM
```

- **Frontend**: React 19 + React Flow + Framer Motion + shadcn/ui + Tailwind CSS
- **Backend**: Hono + Vercel AI SDK + Drizzle ORM
- **Database**: PostgreSQL 16

## Node Types

| Type | Icon | Description |
|------|------|-------------|
| LLM | Bot | Call OpenAI/Anthropic models |
| Condition | GitBranch | Branch on expression evaluation |
| Code | Code | Execute safe JavaScript |
| HTTP | Globe | Make API requests |

## API

All endpoints under `/api/`. Set `x-api-key` header if `API_AUTH_KEY` is configured.

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/workflows | Create workflow |
| GET | /api/workflows | List workflows |
| GET | /api/workflows/:id | Get workflow |
| PUT | /api/workflows/:id | Update workflow |
| DELETE | /api/workflows/:id | Delete workflow |
| POST | /api/workflows/:id/run | Execute workflow |
| GET | /api/workflows/execution/:id/stream | SSE stream |
| GET | /api/models | List available models |
| GET | /api/tools | List available tools |

## Docker

```bash
docker compose up -d
```

## License

MIT
