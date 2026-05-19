# API Key 配置功能设计文档

**日期**: 2025-05-19
**状态**: 设计完成，待实施
**优先级**: P0（核心功能）

## 概述

为 FlowCraft 添加用户界面化的 API Key 和模型配置功能，解决当前依赖环境变量配置的不便问题。

## 需求

### 用户场景
- **当前**: 单用户场景，API Key 全局共享
- **未来**: 数据库设计预留 `user_id` 字段，支持多用户隔离

### AI 提供商支持
- OpenAI（GPT-4o, o1 系列）
- Anthropic（Claude Sonnet 4, Opus 系列）
- 智谱 AI（GLM-4.7 系列）
- 自定义/其他（用户自定义端点）

### 功能范围
- ✅ API Key 管理（必须）
- ✅ 默认模型选择（必须）
- ✅ 自定义模型（建议）
- ✅ 高级参数（可选）

### UI 形式
侧边栏抽屉（Sheet）+ 右上角齿轮按钮唤起

### 安全方案
第一版采用明文存储（自托管场景），未来 SaaS 多用户时升级为加密存储

## 数据库设计

```sql
-- API Key 配置表
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,  -- 'openai' | 'anthropic' | 'zhipu' | 'custom'
  name TEXT NOT NULL,      -- 用户自定义名称
  api_key TEXT NOT NULL,   -- 明文存储
  base_url TEXT,          -- 自定义端点
  is_enabled INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);

-- 模型配置表（预设 + 用户自定义）
CREATE TABLE models (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  max_tokens INTEGER
);

-- 用户偏好表（预留 user_id）
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT,  -- 预留字段
  default_llm_model TEXT,
  default_ai_processor_model TEXT,
  default_workflow_gen_model TEXT,
  request_timeout INTEGER DEFAULT 30000,
  max_retries INTEGER DEFAULT 2
);
```

## 后端 API

```typescript
// apps/backend/src/routes/settings.ts

// API Keys
GET    /api/settings/keys          // 获取列表（key 值脱敏）
POST   /api/settings/keys          // 添加（含验证）
PUT    /api/settings/keys/:id      // 更新
DELETE /api/settings/keys/:id      // 删除
POST   /api/settings/keys/:id/test // 测试连接

// Models
GET    /api/settings/models        // 获取列表
POST   /api/settings/models        // 添加自定义模型
DELETE /api/settings/models/:id    // 删除

// Preferences
GET    /api/settings/preferences   // 获取
PUT    /api/settings/preferences   // 更新
```

## 前端 UI

```typescript
// apps/frontend/src/components/SettingsSidebar.tsx
<Sheet>
  <Tabs defaultValue="api-keys">
    <TabsList>
      <TabsTrigger value="api-keys">API Keys</TabsTrigger>
      <TabsTrigger value="models">模型</TabsTrigger>
      <TabsTrigger value="preferences">偏好</TabsTrigger>
    </TabsList>
    
    <TabsContent value="api-keys">
      <APIKeysPanel />
    </TabsContent>
    
    <TabsContent value="models">
      <ModelsPanel />
    </TabsContent>
    
    <TabsContent value="preferences">
      <PreferencesPanel />
    </TabsContent>
  </Tabs>
</Sheet>
```

**EditorPage 改动**：右上角添加齿轮按钮

## 数据流

**配置流程**：
```
用户添加 API Key 
  → POST /api/settings/keys
  → 后端验证 API
  → 存入数据库
  → 返回成功
```

**执行流程**：
```
工作流执行
  → getModelClient(modelId)
  → 查数据库 API Key
  → fallback 环境变量
  → 创建 client
  → 调用 AI
```

## 实施阶段

### Phase 1（2-3 天）
- 数据库表 + 迁移
- API Key CRUD API
- 设置侧边栏 UI
- 修改 `getModelClient()` 从数据库读取

### Phase 2（1-2 天）
- 自定义模型管理
- 用户偏好设置
- 连接测试功能
- 前端模型选择器集成

## 兼容性

- 环境变量配置继续有效（fallback）
- 现有工作流无需修改
- 平滑迁移，无破坏性变更
