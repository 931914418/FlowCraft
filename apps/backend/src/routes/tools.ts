import { Hono } from 'hono'
import type { ToolDefinition } from '@flowcraft/shared'

const builtinTools: ToolDefinition[] = [
  { name: 'web_search', description: '搜索互联网信息', parameters: [{ name: 'query', type: 'string', required: true, description: '搜索关键词' }] },
  { name: 'json_extract', description: '从 JSON 中提取数据', parameters: [{ name: 'json', type: 'string', required: true, description: 'JSON 字符串' }, { name: 'path', type: 'string', required: true, description: 'JSON Path' }] },
  { name: 'text_transform', description: '文本转换', parameters: [{ name: 'text', type: 'string', required: true, description: '文本内容' }, { name: 'operation', type: 'string', required: true, description: '操作类型' }] },
]

export const toolRoutes = new Hono()
toolRoutes.get('/', (c) => c.json(builtinTools))
