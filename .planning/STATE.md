---
version: "1.0"
last_updated: 2026-05-19
---

# FlowCraft — Project State

## Project Reference

**Core Value**: AI-native workflow platform
**Current Focus**: 全部 5 Phase 实施完成，等待手动验证和部署

## Current Position

- **Phase**: 5 of 5 — 全部完成
- **Status**: 实施完成，等待手动操作
- **Progress**: [██████████] 100%

## Recent Decisions

- nodeOutputs = 单一数据源, variables = 派生视图
- Condition V1/V2 双执行器，不做自动迁移
- CodeExecutor 默认禁用，需 ENABLE_CODE_EXECUTION=1
- Webhook secret 使用 timingSafeEqual
- AI 生成工作流使用 GLM-4.7，简单模式禁止 code 节点
- AIProcessorExecutor 聚合所有上游 nodeOutputs

## Pending Todos

无开发待办

## Blockers/Concerns

无阻塞项

## Human Actions Pending

1. 运行 DB 迁移：`ALTER TABLE workflow_definition ADD COLUMN webhook_path VARCHAR(50) UNIQUE; ALTER TABLE workflow_definition ADD COLUMN webhook_secret VARCHAR(100);`
2. 浏览器端到端手动验证
3. 如需 Code 节点：设置 `ENABLE_CODE_EXECUTION=1`

## Session Continuity

- **Last session**: 2026-05-20 — FlowCraft v2 全量实施完成
- **Stopped at**: 项目实施完成，暂停等待手动验证和部署
- **Resume file**: .planning/.continue-here.md
