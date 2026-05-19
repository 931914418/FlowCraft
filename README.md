# FlowCraft

可视化拖拽式 AI Agent 工作流构建器。TypeScript 全栈。

## 快速开始

```bash
# 1. 前置要求：Node.js 20+, pnpm 9+

# 2. 克隆并安装依赖
git clone <repo-url> && cd flowcraft
pnpm install
```

### SQLite 模式（推荐，零配置）

```bash
# 启动后端（SQLite 自动建表 + seed 示例数据）
cd apps/backend && DB_DRIVER=sqlite npm run dev

# 启动前端（另一个终端）
cd apps/frontend && npm run dev
```

### PostgreSQL 模式

```bash
docker compose up -d postgres
cp .env.example .env
# 编辑 .env 设置 DATABASE_URL
pnpm db:push
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

## 节点类型

| 类型 | 说明 |
|------|------|
| Start | 流程入口，无配置 |
| End | 流程出口，汇总所有节点输出 |
| LLM | 大模型调用（OpenAI / Anthropic / 智谱 / 自定义） |
| Condition | 条件分支，根据字段值路由到 true/false 分支 |
| HTTP | 发起 HTTP 请求（GET / POST / PUT / DELETE） |
| Data Mapper | 字段映射，从上游节点提取指定路径的数据 |
| AI Processor | AI 数据处理，根据指令对上游数据进行智能处理 |
| Code | 执行 JavaScript 代码（默认禁用，需 ENABLE_CODE_EXECUTION=1） |

## AI 工作流生成

支持通过自然语言描述自动生成工作流：

- **简单模式**: 自动生成不含代码节点的基础工作流
- **高级模式**: 支持所有节点类型，可生成复杂的多分支、多步骤工作流

## API Key 配置

FlowCraft 支持通过 Web UI 配置 API Key，无需手动编辑环境变量。

### 支持的 AI 提供商

- **OpenAI**: GPT-4o, GPT-4o Mini, o1 系列
- **Anthropic**: Claude Sonnet 4, Claude Opus 系列
- **智谱 AI**: GLM-4.7, GLM-4 Flash
- **自定义**: 支持自定义端点的 OpenAI 兼容 API

### 配置步骤

1. 点击编辑器右上角 **⚙ 设置** 按钮
2. 在 **API Keys** 标签页点击 **添加**
3. 选择服务商并输入 API Key
4. 点击 **测试连接** 验证配置
5. 保存后即可在工作流中使用

### 环境变量回退

如果数据库中没有配置 API Key，系统自动回退到环境变量：
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `ZHIPU_API_KEY`

## API 端点

所有端点在 `/api/` 路径下。配置 `API_AUTH_KEY` 后需设置 `x-api-key` 请求头。

### 工作流管理

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/workflows | 创建工作流 |
| GET | /api/workflows | 列出所有工作流 |
| GET | /api/workflows/:id | 获取工作流详情 |
| PUT | /api/workflows/:id | 更新工作流 |
| DELETE | /api/workflows/:id | 删除工作流 |
| POST | /api/workflows/:id/run | 执行工作流 |
| GET | /api/workflows/execution/:id/stream | SSE 执行流 |

### AI 生成

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/ai/generate-workflow | AI 生成工作流（参数：description, mode） |

### 设置管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/settings/keys | 获取所有 API Key（脱敏） |
| POST | /api/settings/keys | 添加 API Key |
| PUT | /api/settings/keys/:id | 更新 API Key |
| DELETE | /api/settings/keys/:id | 删除 API Key |
| POST | /api/settings/keys/:id/test | 测试连接 |
| GET | /api/settings/models | 获取模型列表 |
| POST | /api/settings/models | 添加自定义模型 |
| DELETE | /api/settings/models/:id | 删除模型 |
| GET | /api/settings/preferences | 获取偏好设置 |
| PUT | /api/settings/preferences | 更新偏好设置 |

### 其他

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/models | 列出可用模型 |
| GET | /api/tools | 列出可用工具 |
| GET | /health | 健康检查 |

## License

MIT
