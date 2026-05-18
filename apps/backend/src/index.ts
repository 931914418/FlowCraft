import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { workflowRoutes } from './routes/workflows'
import { toolRoutes } from './routes/tools'
import { modelRoutes } from './routes/models'
import testRoutes from './routes/test'
import webhookRoutes from './routes/webhook'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({ origin: ['http://localhost:5175', 'http://localhost:3002'] }))

// Webhook 路由在认证中间件之前注册，外部服务无法发送自定义 API key header
app.route('/api/hooks', webhookRoutes)

const authKey = process.env.API_AUTH_KEY
if (authKey) {
  app.use('/api/*', async (c, next) => {
    const key = c.req.header('x-api-key') || c.req.query('apiKey')
    if (key !== authKey) {
      return c.json({ error: 'Unauthorized', detail: 'Invalid or missing API key. Set x-api-key header.' }, 401)
    }
    await next()
  })
}

app.route('/api/workflows', workflowRoutes)
app.route('/api/tools', toolRoutes)
app.route('/api/models', modelRoutes)
app.route('/api/test', testRoutes)

app.get('/health', (c) => c.json({ status: 'ok' }))

app.onError((err, c) => {
  console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err)
  return c.json({
    error: 'Internal server error',
    detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
  }, 500)
})

const port = Number(process.env.PORT) || 3002

serve({ fetch: app.fetch, port }, () => {
  console.log(`FlowCraft backend running on http://localhost:${port}`)
  if (!process.env.OPENAI_API_KEY) console.warn('[WARN] OPENAI_API_KEY not set. OpenAI models will fail.')
  if (!process.env.ANTHROPIC_API_KEY) console.warn('[WARN] ANTHROPIC_API_KEY not set. Claude models will fail.')
  if (!process.env.ZHIPU_API_KEY) console.warn('[WARN] ZHIPU_API_KEY not set. GLM models will fail.')
})

process.on('SIGTERM', () => {
  console.log('Shutting down...')
  process.exit(0)
})
