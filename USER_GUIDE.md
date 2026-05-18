# FlowCraft 使用指南

## 一、快速配置（5 分钟）

### 1. 检查 API Keys

当前你的配置：
```
✅ PostgreSQL: 已连接
✅ ZHIPU_API_KEY: 已配置（智谱 GLM-4.7）
❌ OPENAI_API_KEY: 未配置
❌ ANTHROPIC_API_KEY: 未配置
```

**配置方法：**

编辑项目根目录的 `.env` 文件：
```bash
# 智谱 GLM（已有，可直接使用）
ZHIPU_API_KEY=9ce9205841c040a78d706323a1f850b5.cI8Jzt5zOiFK02FB

# 如果想用 OpenAI，添加：
OPENAI_API_KEY=sk-your-openai-key-here

# 如果想用 Claude，添加：
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
```

### 2. 确保服务运行

```bash
# 启动后端（在 apps/backend 目录）
cd apps/backend
npx tsx watch src/index.ts

# 启动前端（在 apps/frontend 目录）
cd apps/frontend
npx vite --port 5175
```

### 3. 访问应用

打开浏览器：http://localhost:5175

---

## 二、节点详解（6 种）

### 🟢 Start 节点（开始）

**作用：** 工作流的入口点，任何工作流必须有且只有一个。

**配置项：** 无（只有 Label 可以修改）

**输出：** 触发下游节点，不产生实际数据

**图示：** 绿色圆形，只有右侧出口点

---

### 🔴 End 节点（结束）

**作用：** 工作流的终点，标记工作流完成。

**配置项：** 无（只有 Label 可以修改）

**输入：** 接收上游节点的输出

**图示：** 红色方形，只有左侧入口点

---

### 🤖 LLM 节点（大语言模型）

**作用：** 调用大语言模型进行文本生成、分类、提取等操作。

**配置项：**

| 配置项 | 说明 | 示例 |
|--------|------|------|
| **Model** | 选择要使用的模型 | GLM-4.7, GPT-4o, Claude Sonnet |
| **System Prompt** | 系统提示词，定义 AI 的角色和行为 | "你是一个专业的文案写手" |
| **Prompt** | 用户提示词，支持变量引用 | "请总结以下内容：{{content}}" |
| **Temperature** | 温度参数（0-2），控制输出随机性 | 0.7（较高创造性）|

**输出：** 模型生成的文本 + tokens 消耗量

**使用场景：**
- 内容生成（文章、邮件、代码）
- 文本摘要
- 翻译
- 分类（意图识别、情感分析）
- 信息提取

**变量引用示例：**
```
上游节点输出：{"title": "人工智能", "content": "..."}
当前节点 Prompt：请为标题《{{title}}》写一个简介
实际发送给模型：请为标题《人工智能》写一个简介
```

**图示：** 蓝色卡片，显示模型名和 prompt 预览

---

### 🔀 Condition 节点（条件判断）

**作用：** 根据表达式判断结果，走不同的分支。

**配置项：**

| 配置项 | 说明 | 示例 |
|--------|------|------|
| **Expression** | 条件表达式 | `{{score}} > 80` |

**支持的运算符：**
- `>` 大于
- `<` 小于
- `==` 等于
- `>=` 大于等于
- `<=` 小于等于
- `!=` 不等于

**输出：** `{"branch": "true"}` 或 `{"branch": "false"}`

**连线方式：**
- 绿色出口（true）：条件满足时走这边
- 红色出口（false）：条件不满足时走这边

**使用示例：**
```
上游输出：{"score": 85}
条件表达式：score > 80
结果：走 true 分支
```

**图示：** 黄色卡片，顶部右侧绿色出口（true），底部右侧红色出口（false）

---

### 💻 Code 节点（代码执行）

**作用：** 执行 JavaScript 代码，处理和转换数据。

**配置项：**

| 配置项 | 说明 |
|--------|------|
| **Code** | JavaScript 代码，可访问 input 变量 |

**可用内置对象：**
```javascript
Math, Date, JSON, Array, Object, String, Number,
parseInt, parseFloat, isNaN, isFinite,
encodeURIComponent, decodeURIComponent
```

**使用示例：**

```javascript
// 示例 1：数据清洗
const data = JSON.parse(input.rawData);
return data.filter(item => item.price > 100);

// 示例 2：文本处理
return input.text.toUpperCase().split('\n');

// 示例 3：计算
const prices = input.items.map(i => i.price);
return { total: prices.reduce((a, b) => a + b, 0), count: prices.length };
```

**注意事项：**
- 代码必须 return 结果
- 不要用 async/await（同步执行）
- 不要访问外部变量

**图示：** 紫色卡片，显示代码预览

---

### 🌐 HTTP 节点（网络请求）

**作用：** 发送 HTTP 请求，调用外部 API。

**配置项：**

| 配置项 | 说明 | 示例 |
|--------|------|------|
| **Method** | HTTP 方法 | GET, POST, PUT, DELETE, PATCH |
| **URL** | 请求地址，支持变量 | `https://api.example.com/users/{{userId}}` |
| **Headers** | 请求头（JSON 格式） | `{"Authorization": "Bearer {{token}}"}` |
| **Body** | 请求体（JSON 格式） | `{"name": "{{userName}}"}` |

**安全限制：**
- 不能访问内网地址（localhost, 127.0.0.1, 10.x.x.x, 192.168.x.x）
- 请求超时 30 秒

**使用示例：**
```
URL: https://api.github.com/users/{{username}}
Method: GET
输出: {"login": "octocat", "id": 1, ...}
```

**图示：** 青色卡片，显示 HTTP 方法和 URL

---

## 三、节点可以自定义吗？

### 当前支持的自定义

| 节点类型 | 可自定义项 |
|----------|------------|
| **所有节点** | Label（显示名称）|
| LLM | Model, System Prompt, Prompt, Temperature |
| Condition | Expression（条件表达式）|
| Code | 完整的 JavaScript 代码 |
| HTTP | Method, URL, Headers, Body |
| Start/End | 仅 Label |

### 保存工作流时保存了什么？

```json
{
  "name": "我的工作流",
  "nodes": [
    {
      "id": "start-1",
      "type": "start",
      "label": "开始",
      "config": {},
      "position": {"x": 100, "y": 200}
    },
    {
      "id": "llm-1",
      "type": "llm",
      "label": "生成文案",
      "config": {
        "model": "GLM-4.7",
        "prompt": "请写一篇关于{{topic}}的文章",
        "temperature": 0.7
      },
      "position": {"x": 300, "y": 200}
    }
  ],
  "edges": [
    {"id": "e1", "source": "start-1", "target": "llm-1"}
  ]
}
```

---

## 四、如何新增节点类型？

### 技术上完全可行，需要修改 3 个文件：

#### 1. 定义节点类型（packages/shared/src/index.ts）

```typescript
// 添加新的节点类型
export type NodeType =
  'start' | 'end' | 'llm' | 'condition' | 'code' | 'http' |
  'email'  // 新增：邮件节点

// 添加节点元数据
export const NODE_TYPE_META: Record<NodeType, {...}> = {
  // ... 现有节点
  'email': {
    icon: 'mail',
    label: 'Email',
    color: 'text-purple-600 bg-purple-50 border-purple-200'
  }
}
```

#### 2. 创建前端组件（apps/frontend/src/components/nodes/EmailNode.tsx）

```typescript
export function EmailNode({ data, selected }: NodeProps) {
  return (
    <BaseNode selected={selected}>
      <Mail className="h-4 w-4" />
      <div className="text-xs font-mono truncate">
        {data.config.to || '未配置收件人'}
      </div>
    </BaseNode>
  )
}
```

#### 3. 在 PropertyPanel 添加配置界面（apps/frontend/src/components/PropertyPanel.tsx）

```typescript
{nodeType === 'email' && (
  <>
    <div>
      <label>收件人</label>
      <Input value={localConfig.to} onChange={...} />
    </div>
    <div>
      <label>主题</label>
      <Input value={localConfig.subject} onChange={...} />
    </div>
    <div>
      <label>正文</label>
      <Textarea value={localConfig.body} onChange={...} />
    </div>
  </>
)}
```

#### 4. 注册节点类型（apps/frontend/src/pages/EditorPage.tsx）

```typescript
const nodeTypes = {
  // ... 现有节点
  email: EmailNode,
}
```

#### 5. 实现后端执行器（apps/backend/src/engine/executors.ts）

```typescript
export class EmailExecutor implements NodeExecutor {
  async execute(node: DAGNode, context: ExecutionContext) {
    const { to, subject, body } = node.config as Record<string, any>
    // 调用邮件服务发送邮件
    await sendEmail({ to, subject, body })
    return { output: { sent: true }, tokens: 0 }
  }
}
```

---

## 五、点击 Run 没效果？排查步骤

### 1. 检查工作流是否保存

- 编辑器右上角是否有 "(unsaved)" 提示？
- 先点 **Save** 保存工作流

### 2. 检查节点连接

- 是否有 Start 节点？
- 节点是否都用线连接起来了？
- 是否有孤立的节点？

### 3. 检查 LLM 节点配置

- 是否选择了可用的模型？
- Prompt 是否为空？
- 当前可用模型：GLM-4.7（已配置 API Key）

### 4. 打开浏览器控制台

按 F12，查看是否有错误信息：
- Network 标签：查看 API 请求是否成功
- Console 标签：查看 JavaScript 错误

### 5. 检查后端日志

后端终端会显示执行日志：
```
POST /api/workflows/:id/run
Executing workflow 896eb97a-...
Layer 0: [start-1]
Layer 1: [llm-1]
Layer 2: [end-1]
```

---

## 六、示例工作流

### 示例 1：简单文案生成

```
Start → LLM → End
```

**LLM 配置：**
- Model: GLM-4.7
- Prompt: 请用一句话介绍人工智能

### 示例 2：带条件分支

```
Start → LLM(分类) → Condition(判断是否投诉) → {是: LLM(道歉), 否: LLM(感谢)} → End
```

### 示例 3：数据处理流水线

```
Start → HTTP(获取数据) → Code(清洗) → LLM(分析) → End
```

---

## 七、常见问题

**Q: 为什么 LLM 节点一直转圈？**
A: 模型调用需要时间，GLM-4.7 可能需要 10-30 秒。请耐心等待。

**Q: 如何查看执行结果？**
A: 点击 Run 后，底部会自动弹出 Debug 面板，显示每个节点的执行状态和输出。

**Q: 可以同时运行多个工作流吗？**
A: 可以，每个工作流执行是独立的。

**Q: 工作流执行会保存吗？**
A: 会，点击工作流卡片可以看到历史执行记录。
