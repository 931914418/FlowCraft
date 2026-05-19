# FlowCraft

Visual drag-and-drop AI Agent workflow builder. TypeScript full-stack.

## 快速开始

```bash
# 1. 前置要求：Node.js 20+, pnpm 9+

# 2. 克隆并安装依赖
git clone <repo-url> && cd flowcraft
pnpm install
```

### 两种模式选择

**模式 1：SQLite（推荐，零配置）**

```bash
# 直接启动，自动使用 SQLite 数据库
pnpm dev:sqlite
```

**模式 2：PostgreSQL**

```bash
# 启动 PostgreSQL
docker compose up -d postgres

# 配置环境变量
cp .env.example .env
# 编辑 .env 设置 DATABASE_URL

# 推送数据库 Schema
pnpm db:push

# 启动开发服务器
pnpm dev
```

打开 http://localhost:5175

## 架构

```
Frontend (Vite + React Flow)  →  Backend (Hono + DAG Engine)  →  PostgreSQL / SQLite
         SSE (EventEmitter)                    Drizzle ORM
```

- **Frontend**: React 19 + React Flow + Framer Motion + shadcn/ui + Tailwind CSS
- **Backend**: Hono + Vercel AI SDK + Drizzle ORM
- **Database**: PostgreSQL 16 或 SQLite（零配置）

## API Key 配置

FlowCraft 支持通过 Web UI 配置 API Key，无需手动编辑环境变量。

### 支持的 AI 提供商

- **OpenAI**: GPT-4o, GPT-4o Mini, o1 系列
- **Anthropic**: Claude Sonnet 4, Claude Opus 系列
- **智谱 AI**: GLM-4.7, GLM-4 Flash
- **自定义**: 支持自定义端点的 OpenAI 兼容 API

### 配置步骤

1. 点击编辑器右上角的 **⚙️ 设置** 按钮
2. 在 **API Keys** 标签页点击 **添加**
3. 选择服务商并输入 API Key
4. 点击 **测试连接** 验证配置
5. 保存后即可在工作流中使用

### 环境变量回退

如果数据库中没有配置 API Key，系统会自动回退到环境变量：
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `ZHIPU_API_KEY`

## Node Types

| Type | Icon | Description |
|------|------|-------------|
| LLM | Bot | Call OpenAI/Anthropic models |
| Condition | GitBranch | Branch on expression evaluation |
| Code | Code | Execute safe JavaScript |
| HTTP | Globe | Make API requests |

## API 端点

所有端点都在 `/api/` 路径下。如果配置了 `API_AUTH_KEY`，需要设置 `x-api-key` 请求头。

### 工作流管理

| 方法 | 路径 | 描述 |
|--------|------|-------------|
| POST | /api/workflows | 创建工作流 |
| GET | /api/workflows | 列出所有工作流 |
| GET | /api/workflows/:id | 获取工作流详情 |
| PUT | /api/workflows/:id | 更新工作流 |
| DELETE | /api/workflows/:id | 删除工作流 |
| POST | /api/workflows/:id/run | 执行工作流 |
| GET | /api/workflows/execution/:id/stream | SSE 执行流 |

### 设置管理（API Key 配置）

| 方法 | 路径 | 描述 |
|--------|------|-------------|
| GET | /api/settings/keys | 获取所有 API Key（脱敏） |
| POST | /api/settings/keys | 添加新的 API Key |
| PUT | /api/settings/keys/:id | 更新 API Key |
| DELETE | /api/settings/keys/:id | 删除 API Key |
| POST | /api/settings/keys/:id/test | 测试 API Key 连接 |
| GET | /api/settings/models | 获取所有模型配置 |
| POST | /api/settings/models | 添加自定义模型 |
| DELETE | /api/settings/models/:id | 删除模型 |
| GET | /api/settings/preferences | 获取用户偏好设置 |
| PUT | /api/settings/preferences | 更新用户偏好设置 |

### 其他

| 方法 | 路径 | 描述 |
|--------|------|-------------|
| GET | /api/models | 列出可用模型 |
| GET | /api/tools | 列出可用工具 |
| GET | /health | 健康检查 |

## Docker

```bash
docker compose up -d
```

## License

MIT
