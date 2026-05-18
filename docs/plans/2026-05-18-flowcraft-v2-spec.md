# FlowCraft v2 实施规格书（Spec）

> 日期：2026-05-18
> 状态：SDD 规格定义
> 用途：AI 生成代码的唯一事实来源

---

## 一、领域模型（DDD 轻量）

### 核心实体

```
WorkflowDefinition          WorkflowExecution          NodeExecution
├── id (uuid)               ├── id (uuid)              ├── id (uuid)
├── name                    ├── workflowId              ├── executionId
├── definition (jsonb)      ├── status                  ├── nodeId
│   ├── nodes[]             ├── input (jsonb)           ├── status
│   ├── edges[]             ├── output (jsonb)          ├── input (jsonb)
│   └── trigger             ├── totalTokens             ├── output (jsonb)
├── triggerType              ├── durationMs             ├── tokens
├── webhookPath (新增)       ├── startedAt              ├── durationMs
└── webhookSecret (新增)     └── completedAt            ├── error
                                                        ├── startedAt
                                                        └── completedAt
```

### 新增实体

```
WebhookConfig（嵌入 workflow_definition）
├── path: string          // 唯一路径，如 "abc123"
├── secret: string        // 验证签名用
└── enabled: boolean
```

### 值对象

```
NodeType (v2)
= 'start' | 'end' | 'llm' | 'condition' | 'code' | 'http'
  | 'data-mapper'    // 新增：数据映射
  | 'ai-processor'   // 新增：AI 处理

ExecutionStatus
= 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

TriggerType (v2)
= 'manual' | 'webhook'    // 移除 cron，用外部服务调 webhook
```

### 数据契约（核心！当前最大的混乱源）

**问题：** `context.variables` 存的是 `${nodeId}.output`，值被 `JSON.stringify` 了，下游节点不知道类型。

**v2 规范：** 统一为结构化存储，不再 stringify。

```typescript
// 当前（混乱）
context.variables.set('http-1.output', JSON.stringify(data))  // 字符串
context.variables.set('llm-1.output', 'text...')              // 字符串

// v2（规范）
context.nodeOutputs.set('http-1', data)           // 保持原始类型
context.nodeOutputs.set('llm-1', 'text...')       // 字符串
// variables 保留为模板渲染用（需要字符串的场景）
```

---

## 二、新增节点 Spec

### 2.1 数据映射节点（data-mapper）

**功能：** 从上游数据中选择、重命名字段。

**配置接口：**
```typescript
interface DataMapperConfig {
  sourceNodeId: string          // 上游节点 ID
  mappings: FieldMapping[]      // 字段映射规则
}

interface FieldMapping {
  sourcePath: string            // 源字段路径，如 "company.name"
  targetName: string            // 输出字段名，如 "company"
  enabled: boolean              // 是否启用
}

interface FormatRule {
  type: 'date' | 'number' | 'string'
  format?: string               // 如 "YYYY-MM-DD"，"%.2f"，"uppercase"
}
```

**执行器 Spec：**
```typescript
class DataMapperExecutor implements NodeExecutor {
  execute(node, context, signal?): Promise<{ output: Record<string, unknown>; tokens: 0 }>
}
```

**输入：** `context.nodeOutputs.get(sourceNodeId)` 的数据
**输出：** 按 mappings 过滤和重命名后的对象

**测试用例（TDD）：**

```typescript
describe('DataMapperExecutor', () => {
  it('应提取指定字段')
    input: { name: 'John', age: 30, email: 'john@test.com' }
    mappings: [{ sourcePath: 'name', targetName: 'username', enabled: true }]
    expected: { username: 'John' }

  it('应支持嵌套路径')
    input: { user: { profile: { name: 'John' } } }
    mappings: [{ sourcePath: 'user.profile.name', targetName: 'name', enabled: true }]
    expected: { name: 'John' }

  it('应忽略 disabled 的映射')
    input: { a: 1, b: 2, c: 3 }
    mappings: [
      { sourcePath: 'a', targetName: 'a', enabled: true },
      { sourcePath: 'b', targetName: 'b', enabled: false },
    ]
    expected: { a: 1 }

  it('源字段不存在时应跳过，不报错')
    input: { name: 'John' }
    mappings: [{ sourcePath: 'email', targetName: 'email', enabled: true }]
    expected: {}

  it('应处理数组类型的上游输出')
    input: [{ name: 'A' }, { name: 'B' }]
    mappings: [{ sourcePath: '0.name', targetName: 'first', enabled: true }]
    expected: { first: 'A' }
})
```

---

### 2.2 AI 处理节点（ai-processor）

**功能：** 用自然语言描述数据处理需求，LLM 执行。

**配置接口：**
```typescript
interface AIProcessorConfig {
  instruction: string           // 自然语言处理指令
  model?: string                // 默认 GLM-4.7
  outputFormat?: 'text' | 'json'  // 期望的输出格式
  outputSchema?: string         // JSON schema 描述（可选，指导 LLM 输出结构）
}
```

**执行器 Spec：**
```typescript
class AIProcessorExecutor implements NodeExecutor {
  execute(node, context, signal?): Promise<{ output: string; tokens: number }>
}
```

**输入：** 自动将上游所有 nodeOutputs 序列化为上下文
**输出：** LLM 的文本响应

**Prompt 构造规则：**
```
你是一个数据处理助手。根据用户指令处理以下数据。

上游数据：
${JSON.stringify(allUpstreamOutputs, null, 2)}

处理指令：
${config.instruction}

${config.outputFormat === 'json' ? '请以 JSON 格式返回结果。' : ''}
${config.outputSchema ? `输出格式要求：${config.outputSchema}` : ''}
```

**测试用例（TDD）：**

```typescript
describe('AIProcessorExecutor', () => {
  it('应将上游数据传递给 LLM 并返回结果')
    // 需要 mock LLM 调用

  it('应正确统计 tokens')
    // 验证 tokens 来自 LLM 返回值

  it('outputFormat 为 json 时应在 prompt 中要求 JSON 格式')
    // 验证 prompt 构造

  it('上游无数据时应提示 LLM 无输入')
    // 空输入场景
})
```

---

### 2.3 Condition 节点改造

**当前配置：** `{ expression: "input.count > 5" }`

**v2 配置：**
```typescript
interface ConditionConfigV2 {
  field: {
    sourceNodeId: string        // 上游节点 ID
    path: string                // 字段路径，如 "status"
  }
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'empty' | 'not_empty'
  value: string | number | boolean
}
```

**执行器改造：**
```typescript
class ConditionExecutor implements NodeExecutor {
  execute(node, context): Promise<{ output: { branch: 'true' | 'false' }; tokens: 0 }>
}
```

**逻辑：**
1. 从 `context.nodeOutputs.get(sourceNodeId)` 获取数据
2. 按 path 解析字段值
3. 按 operator 与 value 比较
4. 返回 `{ branch: 'true' }` 或 `{ branch: 'false' }`

**测试用例（TDD）：**

```typescript
describe('ConditionExecutor V2', () => {
  it('eq 操作符')
    field: { sourceNodeId: 'http-1', path: 'status' }, operator: 'eq', value: 200
    upstream: { status: 200 } → branch: 'true'
    upstream: { status: 404 } → branch: 'false'

  it('contains 操作符')
    field: { sourceNodeId: 'llm-1', path: '' }, operator: 'contains', value: 'success'
    upstream: 'The operation was a success' → branch: 'true'

  it('empty 操作符')
    operator: 'empty', value: ''
    upstream: null → branch: 'true'
    upstream: 'data' → branch: 'false'

  it('嵌套路径')
    path: 'data.user.age', operator: 'gt', value: 18
    upstream: { data: { user: { age: 25 } } } → branch: 'true'

  it('字段不存在时应返回 false')
    path: 'nonexistent', operator: 'eq', value: 'anything'
    upstream: {} → branch: 'false'
})
```

---

## 三、新增 API Spec

### 3.1 Webhook 触发

**路由：** `POST /api/hooks/:hookPath`

**请求：**
```typescript
// POST /api/hooks/abc123
// Content-Type: application/json
// X-Webhook-Secret: <secret>（可选，配置了才验证）

{
  // 任意 JSON，作为工作流的 input
  "event": "push",
  "data": { ... }
}
```

**响应：**
```typescript
// 200
{ executionId: string, status: 'running' }

// 404
{ error: 'Webhook not found' }

// 401
{ error: 'Invalid webhook secret' }
```

**数据库变更：**
```sql
ALTER TABLE workflow_definition ADD COLUMN webhook_path VARCHAR(50) UNIQUE;
ALTER TABLE workflow_definition ADD COLUMN webhook_secret VARCHAR(100);
```

**测试用例（TDD）：**

```typescript
describe('Webhook API', () => {
  it('有效 hookPath 应触发工作流执行')
    POST /api/hooks/abc123 → 200 { executionId, status: 'running' }

  it('不存在的 hookPath 应返回 404')
    POST /api/hooks/nonexistent → 404

  it('配置了 secret 时，错误 secret 应返回 401')
    POST /api/hooks/abc123 (无 secret header) → 401

  it('请求 body 应作为工作流 input 传递')
    // 验证 execution 的 input 字段

  it('同一 hookPath 不能重复')
    // 两个工作流不能有相同的 webhook_path
})
```

---

### 3.2 AI 生成工作流

**路由：** `POST /api/ai/generate-workflow`

**请求：**
```typescript
{
  description: string   // 用户自然语言描述
  mode?: 'simple' | 'advanced'  // 默认 simple
}
```

**响应：**
```typescript
{
  workflow: WorkflowDefinition   // 完整的工作流定义
  explanation: string            // AI 解释生成了什么
}
```

**LLM Prompt 模板：**
```
你是 FlowCraft 工作流设计助手。根据用户描述生成工作流定义。

可用节点类型：
- start: 流程开始
- end: 流程结束
- http: HTTP 请求（配置：url, method, headers, body）
- llm: 大模型调用（配置：model, prompt, system, temperature）
- data-mapper: 数据映射（配置：sourceNodeId, mappings）
- ai-processor: AI 数据处理（配置：instruction, model, outputFormat）
- condition: 条件判断（配置：field, operator, value）

可用模型：GLM-4.7, gpt-4o, claude-sonnet-4-20250514

输出格式：严格 JSON
{
  "name": "工作流名称",
  "nodes": [...],
  "edges": [...],
  "explanation": "解释"
}

节点 ID 命名规则：{类型简写}-{序号}，如 start-1, http-1, llm-1, end-1
边 ID 命名规则：e{序号}，如 e1, e2

用户描述：${description}
```

**测试用例（TDD）：**

```typescript
describe('AI Generate Workflow', () => {
  it('应返回有效的 WorkflowDefinition JSON')
    input: "获取 GitHub 用户信息并翻译成中文"
    expect: valid { name, nodes[], edges[] }

  it('简单模式下不应包含 code 类型节点')
    mode: 'simple'
    expect: nodes 中没有 type: 'code'

  it('应自动连接节点（生成有效的边）')
    expect: 每个 edge 的 source 和 target 都对应存在的 node

  it('描述无法理解时应返回友好错误')
    input: "asdfghjkl"
    expect: { error: '无法理解需求，请更详细描述' }
})
```

---

### 3.3 节点测试 API

**路由：** `POST /api/test/node`

**请求：**
```typescript
{
  nodeType: 'http' | 'llm' | 'condition' | 'data-mapper' | 'ai-processor'
  config: Record<string, unknown>      // 节点配置
  testInput?: Record<string, unknown>  // 模拟的上游数据
}
```

**响应：**
```typescript
{
  success: boolean
  output: unknown       // 执行结果
  durationMs: number
  error?: string
}
```

**用途：** HTTP 节点的"测试"按钮，以及任何节点的独立测试。

---

## 四、前端组件 Spec

### 4.1 AI 对话栏

**位置：** 编辑器页面顶部，名称输入框旁边

**接口：**
```typescript
interface AIChatBarProps {
  onGenerate: (workflow: WorkflowDefinition) => void
  mode: 'simple' | 'advanced'
}
```

**行为：**
1. 用户输入描述 → 回车或点击生成
2. 显示 loading 状态
3. API 返回后，调用 onGenerate 将工作流渲染到画布
4. 失败时显示错误提示

### 4.2 数据映射配置面板

**位置：** PropertyPanel 中，data-mapper 类型节点

**接口：**
```typescript
interface DataMapperPanelProps {
  config: DataMapperConfig
  upstreamData?: Record<string, unknown>  // 上游节点的实际输出（可选）
  onChange: (config: DataMapperConfig) => void
}
```

**行为：**
1. 如果有 upstreamData，解析并显示为树形结构
2. 每个字段旁边有勾选框和重命名输入框
3. 勾选/取消/重命名 → 实时更新 config
4. "AI 帮我选字段"按钮 → 调用 LLM 分析 upstreamData 并推荐 mappings

### 4.3 Condition 可视化面板

**替换当前的文本表达式输入为三个下拉框：**
1. 字段选择：列出上游节点的所有字段路径
2. 操作符选择：eq/neq/gt/lt/gte/lte/contains/empty/not_empty
3. 值输入：文本/数字输入框（empty/not_empty 时隐藏）

---

## 五、BDD 关键场景

### 场景 1：用户用自然语言创建工作流

```gherkin
Feature: AI 生成工作流
  Scenario: 简单的数据获取和处理
    Given 用户在编辑器页面
    And 模式为"简单模式"
    When 用户在 AI 对话栏输入"获取 GitHub 热门项目并翻译标题"
    And 点击生成
    Then 画布上应出现至少 3 个节点
    And 不应出现 Code 类型节点
    And 节点之间应有连线
```

### 场景 2：数据映射节点使用

```gherkin
Feature: 数据映射
  Scenario: 从 HTTP 响应中提取字段
    Given 工作流包含 HTTP 节点，已执行并返回用户数据
    When 用户添加数据映射节点并连接到 HTTP 节点
    Then 面板应显示 HTTP 响应的字段列表
    When 用户勾选 name 和 email 字段
    And 点击 Run
    Then 数据映射节点输出应为 { name: "...", email: "..." }
```

### 场景 3：Webhook 触发工作流

```gherkin
Feature: Webhook 触发
  Scenario: 外部系统触发工作流
    Given 工作流配置了 Webhook 触发
    When 外部系统 POST /api/hooks/abc123 with body { "message": "hello" }
    Then 工作流应开始执行
    And input 应为 { "message": "hello" }
    And 响应状态码应为 200
```

### 场景 4：节点级模式切换

```gherkin
Feature: 模式切换
  Scenario: 将数据映射节点升级为代码节点
    Given 工作流中有一个数据映射节点
    When 用户点击"切换为代码模式"
    Then 节点应变为 Code 类型
    And 属性面板应显示代码编辑器
    And 画布上的其他节点不受影响
```

---

## 六、实施顺序（Phase）

### Phase 1：基础改造（3-4 天）

**目标：** 修复数据契约 + Condition 可视化

| 任务 | 类型 | Spec 引用 |
|------|------|----------|
| 统一 nodeOutputs 数据契约 | 改造 | 第一节"数据契约" |
| Condition 可视化配置 | 改造 | 2.3 节 |
| Condition V2 执行器 | 改造 | 2.3 节测试用例 |
| Condition 前端面板 | 改造 | 4.3 节 |

### Phase 2：HTTP 测试 + Webhook（3-4 天）

**目标：** HTTP 可测试 + 外部触发

| 任务 | 类型 | Spec 引用 |
|------|------|----------|
| 节点测试 API | 新增 | 3.3 节 |
| HTTP 测试按钮（前端） | 新增 | 4.3 节 |
| Webhook 数据库迁移 | 新增 | 3.1 节 |
| Webhook 路由 | 新增 | 3.1 节测试用例 |
| Webhook 前端配置 | 新增 | 4.3 节 |

### Phase 3：数据映射节点（3-4 天）

**目标：** 替代 Code 节点的可视化方案

| 任务 | 类型 | Spec 引用 |
|------|------|----------|
| DataMapperExecutor | 新增 | 2.1 节测试用例 |
| DataMapper 前端面板 | 新增 | 4.2 节 |
| 上游数据预览机制 | 新增 | 4.2 节 |
| AI 选字段功能 | 新增 | 4.2 节 |

### Phase 4：AI 助手（4-5 天）

**目标：** 自然语言生成工作流

| 任务 | 类型 | Spec 引用 |
|------|------|----------|
| AI 生成工作流 API | 新增 | 3.2 节测试用例 |
| AI 对话栏组件 | 新增 | 4.1 节 |
| 简单/高级模式过滤 | 新增 | 4.1 节 |
| AI 生成结果渲染到画布 | 新增 | 4.1 节 |

### Phase 5：AI 处理节点 + 模式切换（2-3 天）

**目标：** 完整双模式体验

| 任务 | 类型 | Spec 引用 |
|------|------|----------|
| AIProcessorExecutor | 新增 | 2.2 节测试用例 |
| AI 处理节点前端面板 | 新增 | 4.2 节 |
| 节点级模式切换 UI | 新增 | BDD 场景 4 |
| 节点面板模式过滤 | 新增 | 4.1 节 |

---

## 七、验收标准（按 Phase）

### Phase 1
- [ ] Condition 节点配置界面有三个下拉框，不需要写代码
- [ ] Condition 执行器通过所有 5 个测试用例
- [ ] 旧工作流（表达式格式）自动迁移到新格式

### Phase 2
- [ ] HTTP 节点有"测试"按钮，点击可预览响应
- [ ] Webhook URL 可复制，curl 可触发执行
- [ ] Webhook secret 验证生效

### Phase 3
- [ ] 数据映射节点显示上游字段列表
- [ ] 勾选字段后执行，输出只包含选中字段
- [ ] 通过所有 5 个 DataMapper 测试用例

### Phase 4
- [ ] AI 对话栏输入描述后，画布自动生成节点
- [ ] 简单模式不出现 Code 节点
- [ ] 生成的节点有合理的默认配置

### Phase 5
- [ ] AI 处理节点通过自然语言处理数据
- [ ] 节点可从简单模式切换到代码模式
- [ ] 所有 BDD 场景通过
