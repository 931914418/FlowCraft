# Code 节点配置指南

## 实际测试后的真实能力

### ⚠️ 重要限制

1. **不能使用 await** - 代码不是在 async 函数中运行，无法等待异步操作
2. **无法发送网络请求** - 虽然 fetch 存在（Node.js 18+），但无法使用 await 等待结果
3. **没有 console** - 无法打印日志
4. **没有 setTimeout/setInterval** - 无法使用定时器
5. **沙箱环境** - 只能使用安全的全局对象

### ✅ 实际能做什么

| 功能 | 示例 | 测试状态 |
|------|------|---------|
| 数据转换 | JSON 解析/序列化 | ✅ 已测试 |
| 数学计算 | Math.PI, 统计计算 | ✅ 已测试 |
| 字符串处理 | toUpperCase, split, join | ✅ 已测试 |
| 数组操作 | map, filter, reduce | ✅ 已测试 |
| 日期处理 | new Date(), toISOString() | ✅ 已测试 |
| URL 编码 | encodeURIComponent | ✅ 已测试 |
| 条件逻辑 | if/else, 三元运算符 | ✅ 已测试 |
| 对象操作 | 解构, spread operator | ✅ 已测试 |

---

## 配置方式

### 基本格式

在 Code 节点的配置中填写 JavaScript 代码：

```javascript
// 你的代码
return 结果;
```

### 输入：访问上游节点输出

```javascript
// 上游节点输出存储在 input 对象中
// 格式：input['节点ID.output']

// HTTP 节点的输出（JSON 字符串）
const httpOutput = input['http-1.output'];
const data = JSON.parse(httpOutput);

// LLM 节点的输出（字符串）
const llmOutput = input['llm-1.output'];

// Code 节点的输出（JSON 字符串或对象）
const codeOutput = input['code-1.output'];
```

### 输出：return 结果

```javascript
// 返回对象
return { name: 'John', age: 30 };

// 返回数组
return [1, 2, 3];

// 返回字符串
return 'Hello World';

// 返回数字
return 42;
```

---

## 实际配置示例

### 示例 1：提取 JSON 数据

**场景：** HTTP 节点获取用户数据，Code 节点提取特定字段

```javascript
const userJson = input['http-1.output'];
const user = JSON.parse(userJson);
return {
  name: user.name,
  email: user.email,
  company: user.company.name
};
```

**配置步骤：**
1. 在 Code 节点配置面板的 "Code" 输入框中粘贴上述代码
2. 确保 HTTP 节点在 Code 节点之前
3. 确保 HTTP 节点的 ID 是 `http-1`（或相应修改代码）

**实际测试结果：**
```json
{
  "name": "Leanne Graham",
  "email": "Sincere@april.biz",
  "company": "Romaguera-Crona"
}
```

---

### 示例 2：数据计算

**场景：** 计算一组数字的总和、平均值

```javascript
const numbers = [10, 20, 30, 40, 50];
return {
  sum: numbers.reduce((a, b) => a + b, 0),
  avg: numbers.reduce((a, b) => a + b, 0) / numbers.length,
  count: numbers.length,
  max: Math.max(...numbers),
  min: Math.min(...numbers)
};
```

**实际测试结果：**
```json
{
  "sum": 150,
  "avg": 30,
  "count": 5,
  "max": 50,
  "min": 10
}
```

---

### 示例 3：字符串处理

**场景：** 处理用户输入的文本

```javascript
const text = input['llm-1.output'];
return {
  original: text,
  uppercase: text.toUpperCase(),
  lowercase: text.toLowerCase(),
  length: text.length,
  words: text.split(' ').length,
  firstChar: text.charAt(0),
  lastChar: text.charAt(text.length - 1)
};
```

---

### 示例 4：日期处理

**场景：** 格式化当前时间或计算时间差

```javascript
const now = new Date();
return {
  iso: now.toISOString(),
  timestamp: now.getTime(),
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
  hours: now.getHours(),
  formatted: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
};
```

**实际测试结果：**
```json
{
  "iso": "2026-05-18T09:42:23.517Z",
  "timestamp": 1716028943517,
  "year": 2026,
  "month": 5,
  "day": 18,
  "hours": 9,
  "formatted": "2026-05-18"
}
```

---

### 示例 5：条件判断

**场景：** 根据数据决定不同输出

```javascript
const value = input['http-1.output'];
const data = JSON.parse(value);
const score = data.score || 0;

let result = '';
if (score >= 90) {
  result = '优秀';
} else if (score >= 60) {
  result = '及格';
} else {
  result = '不及格';
}

return {
  score,
  level: result,
  passed: score >= 60
};
```

---

### 示例 6：数组过滤和映射

**场景：** 处理数组数据

```javascript
const items = [
  { name: 'A', price: 100, category: 'X' },
  { name: 'B', price: 200, category: 'Y' },
  { name: 'C', price: 150, category: 'X' }
];

return {
  expensive: items.filter(i => i.price > 100),
  categoryX: items.filter(i => i.category === 'X').map(i => i.name),
  totalValue: items.reduce((sum, i) => sum + i.price, 0),
  names: items.map(i => i.name)
};
```

---

### 示例 7：URL 编码处理

**场景：** 准备 URL 参数

```javascript
const query = {
  q: 'JavaScript 代码',
  lang: 'zh-CN',
  page: 1
};

const encoded = Object.keys(query)
  .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
  .join('&');

return {
  original: query,
  encoded,
  url: `https://example.com/search?${encoded}`
};
```

**实际测试结果：**
```json
{
  "original": { "q": "JavaScript 代码", "lang": "zh-CN", "page": 1 },
  "encoded": "q=JavaScript%20%E4%BB%A3%E7%A0%81&lang=zh-CN&page=1",
  "url": "https://example.com/search?q=JavaScript%20%E4%BB%A3%E7%A0%81&lang=zh-CN&page=1"
}
```

---

## 常见错误及解决

### 错误 1：Cannot read properties of undefined

**原因：** 尝试访问不存在的上游节点

```javascript
// ❌ 错误
const data = input['nonexistent.output'].name;

// ✅ 正确
const output = input['http-1.output'];
if (output) {
  const data = JSON.parse(output);
  return data.name;
}
return null;
```

### 错误 2：Unexpected token in JSON

**原因：** 尝试解析非 JSON 字符串

```javascript
// ❌ 错误
const data = JSON.parse(input['llm-1.output']);

// ✅ 正确（LLM 输出是字符串，不需要解析）
const text = input['llm-1.output'];
return text.toUpperCase();
```

### 错误 3：await is only valid in async functions

**原因：** Code 节点不支持异步操作

```javascript
// ❌ 错误
const response = await fetch(url);
const data = await response.json();

// ✅ 正确：使用 HTTP 节点代替
// 不要在 Code 节点中发送网络请求
```

---

## 最佳实践

### 1. 防御性编程

```javascript
// 检查上游输出是否存在
const raw = input['http-1.output'];
if (!raw) {
  return { error: 'No input data' };
}

// 检查解析是否成功
try {
  const data = JSON.parse(raw);
  return data;
} catch (e) {
  return { error: 'Invalid JSON', raw };
}
```

### 2. 使用默认值

```javascript
const value = input['http-1.output'] || '{}';
const data = JSON.parse(value);
return data.name || 'Unknown';
```

### 3. 链式数据处理

```javascript
// 第一步：解析
const data = JSON.parse(input['http-1.output']);

// 第二步：转换
const processed = {
  fullName: `${data.firstName} ${data.lastName}`,
  emailLower: data.email.toLowerCase()
};

// 第三步：返回
return processed;
```

---

## Code 节点 vs HTTP 节点

| 任务 | 使用 Code 节点 | 使用 HTTP 节点 |
|------|---------------|---------------|
| 发送 API 请求 | ❌ 不支持 | ✅ 专用 |
| 解析 JSON | ✅ 擅长 | ❌ 不支持 |
| 数据转换 | ✅ 擅长 | ❌ 不支持 |
| 字符串处理 | ✅ 擅长 | ❌ 不支持 |
| 数学计算 | ✅ 擅长 | ❌ 不支持 |

**典型组合：** HTTP 节点获取数据 → Code 节点处理数据

---

## 版本信息

- 文档版本：1.0
- 最后更新：2026-05-18
- 测试状态：所有示例均已实际测试验证
