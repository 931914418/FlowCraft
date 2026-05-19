# FlowCraft 节点功能指南

## 节点类型总览

| 节点 | 图标 | 颜色 | 功能 |
|------|------|------|------|
| Start | PlayCircle | green | 流程开始 |
| End | Square | red | 流程结束，汇总输出 |
| LLM | bot | blue | 调用大语言模型 |
| HTTP | globe | cyan | 发送 HTTP 请求 |
| Code | code | purple | 执行 JavaScript 代码 |
| Condition | git-branch | amber | 条件判断，控制分支 |

---

## 1. LLM 节点

### 功能
调用大语言模型进行文本生成、问答、翻译等任务。

### 支持的模型

#### OpenAI
- GPT-4o
- GPT-4o Mini
- GPT-3.5 Turbo

#### Anthropic
- Claude Sonnet 4
- Claude Haiku 4

#### 智谱 AI
- GLM-4.7

### 配置参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| model | string | 是 | 模型 ID |
| prompt | string | 是 | 提示词，支持变量模板 |
| system | string | 否 | 系统提示词 |
| temperature | number | 否 | 温度参数 (0-1)，默认 0.7 |

### 变量模板语法

```
{{变量名}} 或 {{上游节点ID.output}}
```

### 示例配置

```json
{
  "model": "GLM-4.7",
  "prompt": "请分析以下用户反馈：{{feedback.input}}",
  "system": "你是一个专业的产品分析师。",
  "temperature": 0.7
}
```

### 实际应用
- 文本生成、摘要、翻译
- 智能问答、对话
- 内容创作、文案生成
- 代码解释、文档生成

---

## 2. HTTP 节点

### 功能
发送 HTTP 请求到外部 API，获取数据或触发 Webhook。

### 配置参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | 是 | 请求 URL，支持变量模板 |
| method | string | 否 | HTTP 方法：GET/POST/PUT/DELETE，默认 GET |
| headers | object | 否 | 请求头 |
| body | object | 否 | 请求体（POST/PUT 时使用） |

### 安全限制

⚠️ **禁止访问内网地址**，以下地址会被阻止：
- localhost, 127.0.0.1
- 10.x.x.x, 192.168.x.x
- 172.16.x.x - 172.31.x.x
- 169.254.x.x
- 0.0.0.0

### 示例配置

```json
{
  "url": "https://api.github.com/users/{{username}}",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer {{token}}"
  }
}
```

### 实际应用
- 调用第三方 API（GitHub、天气、金融数据）
- Webhook 集成（Slack、钉钉、企业微信）
- 数据采集、爬虫
- 微服务调用

---

## 3. Code 节点

### 功能
执行 JavaScript 代码进行数据处理、转换、计算。

### 配置参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | JavaScript 代码 |

### 可用全局对象

```javascript
Math, Date, JSON, Array, Object, String, Number, Boolean
parseInt, parseFloat, isNaN, isFinite
encodeURIComponent, decodeURIComponent
```

### 输入输出

**输入：** `input` 对象，包含所有上游节点的输出

**访问上游输出：**
```javascript
// 上游节点输出存储为 JSON 字符串
const value = input['节点ID.output'];
const data = JSON.parse(value);

// 或者直接使用（如果是字符串）
const text = input['节点ID.output'];
```

**输出：** `return` 任意值

### 示例代码

```javascript
// 数据提取
const userJson = input['http-1.output'];
const user = JSON.parse(userJson);
return {
  name: user.name,
  email: user.email
};

// 数据计算
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);
return { sum, count: numbers.length };

// 字符串处理
const text = input['llm-1.output'];
return text.toUpperCase();
```

### ⚠️ 重要限制

**Code 节点不能做的事情：**
- ❌ 不能发送网络请求（无 await，无法等待 fetch）
- ❌ 不能使用 console（无法打印日志）
- ❌ 不能使用 setTimeout/setInterval（无定时器）
- ❌ 不能访问文件系统（沙箱限制）

**Code 节点能做的事情（已测试验证）：**
- ✅ 数据转换、格式化（JSON 解析/序列化）
- ✅ 数学计算、统计（Math 对象）
- ✅ 字符串处理（toUpperCase, split, join 等）
- ✅ 数组操作（map, filter, reduce）
- ✅ 日期处理（Date 对象）
- ✅ URL 编码（encodeURIComponent）
- ✅ 条件逻辑（if/else, 三元运算符）

详细配置示例请参考 [CODE_NODE_GUIDE.md](./CODE_NODE_GUIDE.md)

### 实际应用
- 数据转换、格式化
- 数学计算、统计
- 字符串处理、数组操作
- 条件逻辑、数据验证

---

## 4. Condition 节点

### 功能
根据条件判断结果，控制流程走向（分支执行）。

### 配置参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| expression | string | 是 | 条件表达式 |

### 支持的操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| > | 大于 | `input.count > 5` |
| < | 小于 | `input.price < 100` |
| == | 等于 | `input.status == 'success'` |
| >= | 大于等于 | `input.score >= 60` |
| <= | 小于等于 | `input.age <= 18` |
| != | 不等于 | `input.type != 'admin'` |

### 分支连接

Condition 节点有两个输出端口：
- **true**: 条件成立时执行的分支
- **false**: 条件不成立时执行的分支

### 示例配置

```json
{
  "expression": "input.count > 10"
}
```

### 实际应用
- 数据质量检查（过滤无效数据）
- 流程控制（根据结果选择不同处理）
- 异常处理（错误时走告警分支）
- A/B 测试（随机分流）

---

## 5. Start 节点

### 功能
工作流的入口点，标识流程开始。

### 配置
无需配置。

---

## 6. End 节点

### 功能
工作流的出口点，汇总并输出最终结果。

### 配置

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| output | any | 否 | 自定义输出，默认汇总所有上游节点输出 |

### 输出格式

默认情况下，End 节点会汇总所有直接前驱节点的输出：

```json
{
  "节点ID1": 节点1的输出,
  "节点ID2": 节点2的输出
}
```

---

## 变量传递机制

### 节点输出存储

每个节点的输出会自动存储为变量：

```javascript
// 格式
input['节点ID.output']

// 示例
input['http-1.output']  // HTTP 节点的输出
input['llm-1.output']   // LLM 节点的输出
input['code-1.output']  // Code 节点的输出
```

### 在模板中使用

在 LLM 节点的 prompt 或 HTTP 节点的 url 中使用：

```
{{上游节点ID.output}}
```

### 变量类型

| 节点类型 | 输出类型 | 存储格式 |
|----------|----------|----------|
| HTTP | object | JSON 字符串 |
| LLM | string | 原字符串 |
| Code | any | JSON 序列化（对象）或原字符串 |
| Condition | object | JSON 字符串 |

---

## 已验证的应用场景

### ✅ 场景 1：数据获取与智能总结

**流程：** HTTP → Code → LLM → End

**实际测试结果：**
```
1. HTTP 节点：获取 JSONPlaceholder 用户数据 (590ms)
2. Code 节点：提取 {name, email, company}
3. LLM 节点：生成一句话介绍 (16.9s, 549 tokens)
```

**输出示例：**
```
"Leanne Graham 是 Romaguera-Crona 的员工，邮箱为 Sincere@april.biz。"
```

### ✅ 场景 2：条件分支处理

**流程：** Start → Condition → (LLM | Code) → End

**实际测试结果：**
```
Condition 返回 false → LLM 节点被跳过 → Code 节点执行
```

### ⚠️ 待验证场景

以下场景基于节点能力推断，**未实际测试**：

#### 数据监控与告警
```
Start → HTTP (检查状态) → Condition (判断异常)
  ↓ true
  LLM (生成告警消息) → HTTP (发送通知)
  ↓ false
  End (正常结束)
```

#### AI 内容生成管道
```
Start → HTTP (获取素材) → Code (格式化)
  → LLM (生成内容) → Code (后期处理)
  → End
```

#### 自动化客服
```
Start → HTTP (获取用户消息) → Code (意图识别)
  → Condition (判断类型)
    ↓ product
    LLM (产品问答)
    ↓ complaint
    LLM (安抚回复) → HTTP (创建工单)
```

---

## 最佳实践

### 1. 变量命名规范

使用有意义的节点 ID：
```
好的命名：get-user-info, extract-email, generate-summary
差的命名：node-1, node-2, abc
```

### 2. 错误处理

使用 Condition 节点检查上游结果：
```javascript
expression: input['http-1.output'].status == 200
```

### 3. 数据转换

HTTP 输出是 JSON 字符串，在 Code 节点中解析：
```javascript
const data = JSON.parse(input['http-1.output']);
```

### 4. 性能优化

- LLM 节点耗时较长（10-30秒），尽量放在流程后段
- HTTP 节点设置超时（默认 30 秒）
- Code 节点避免无限循环

### 5. 调试技巧

查看 Debug 面板中的每个节点：
- 点击节点展开查看详细输出
- 检查 error 字段定位问题
- 查看 durationMs 优化性能

---

## 限制与注意事项

### 安全限制

1. **HTTP 节点**：禁止访问内网地址
2. **Code 节点**：沙箱环境，仅限安全全局对象
3. **LLM 节点**：依赖外部 API，可能有延迟和费用

### 技术限制

1. **变量传递**：节点间传递的是 JSON 字符串或对象
2. **条件表达式**：仅支持简单比较，不支持复杂逻辑
3. **并发执行**：同一层级的节点并行执行，无共享状态

### 使用建议

1. **测试先行**：使用公开 API 测试 HTTP 节点
2. **错误处理**：每个关键节点后添加 Condition 检查
3. **日志记录**：查看 Debug 面板追踪执行过程
4. **成本控制**：LLM 节点会产生 token 消耗

---

## 版本信息

- 文档版本：1.0
- 最后更新：2026-05-18
- 测试状态：部分场景已验证，详见"已验证的应用场景"章节
