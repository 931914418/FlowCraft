import { Hono } from 'hono'

const models = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', modelId: 'gpt-4o', enabled: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', modelId: 'gpt-4o-mini', enabled: true },
  { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'anthropic', modelId: 'claude-sonnet-4-20250514', enabled: true },
  { id: 'claude-haiku', name: 'Claude Haiku', provider: 'anthropic', modelId: 'claude-haiku-4-5-20251001', enabled: true },
]

export const modelRoutes = new Hono()
modelRoutes.get('/', (c) => c.json(models))
