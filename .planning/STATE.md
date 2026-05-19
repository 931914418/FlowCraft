---
version: "1.0"
last_updated: 2026-05-19
---

# FlowCraft — Project State

## Project Reference

**Core Value**: AI-native workflow platform
**Current Focus**: API Key 配置功能已完成，系统正常运行

## Current Position

- **Phase**: API Key 配置功能实施完成
- **Status**: 功能完整，已提交
- **Progress**: [██████████] 100%

## Recent Decisions

- nodeOutputs = 单一数据源, variables = 派生视图
- Condition V1/V2 双执行器，不做自动迁移
- CodeExecutor 默认禁用，需 ENABLE_CODE_EXECUTION=1
- Webhook secret 使用 timingSafeEqual
- AI 生成工作流使用 GLM-4.7，简单模式禁止 code 节点
- AIProcessorExecutor 聚合所有上游 nodeOutputs
- **API Key 配置优先使用数据库，fallback 环境变量**
- **SQLite 零配置启动，支持完整功能**

## Pending Todos

无开发待办

## Blockers/Concerns

无阻塞项

## Human Actions Pending

1. 手动测试浏览器端功能（http://localhost:5175）
2. 配置真实的 API Key 并测试工作流执行
3. 如需 Code 节点：设置 `ENABLE_CODE_EXECUTION=1`

## Session Continuity

- **Last session**: 2026-05-19 — API Key 配置功能通过 Agent Swarm 完整实施
- **Stopped at**: 功能开发完成，服务运行正常，等待手动验证
- **Resume file**: 无（功能已完成）

## Completed Features

### API Key 配置功能 ✅

**数据库**：
- api_keys 表（API Key 配置）
- models 表（模型配置）
- user_preferences 表（用户偏好）

**后端 API**：
- GET/POST/PUT/DELETE /api/settings/keys
- POST /api/settings/keys/:id/test
- GET/POST/DELETE /api/settings/models
- GET/PUT /api/settings/preferences

**前端 UI**：
- SettingsSidebar 组件（3 个 Tab 面板）
- 编辑器右上角齿轮按钮
- API Key 脱敏显示
- 连接测试功能

**集成**：
- getModelClient() 从数据库读取 API Key
- 环境变量回退机制
- 向后兼容

## Service Status

- **后端**: localhost:3002 (SQLite 模式)
- **前端**: localhost:5175
- **数据库**: SQLite (flowcraft.db)
- **测试**: 94/94 passing
