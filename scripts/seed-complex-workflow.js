#!/usr/bin/env node
// 生成复杂演示工作流 — 智能多源市场情报分析系统
// 使用 Node.js 发送请求，确保 UTF-8 编码正确

const workflow = {
  name: '智能多源市场情报分析系统',
  trigger: { type: 'webhook' },
  webhookPath: 'market-intel',
  webhookSecret: 'secret123',
  nodes: [
    {
      id: 'start-1', type: 'start',
      position: { x: 0, y: 300 }, config: {},
      label: '接收请求'
    },
    {
      id: 'http-weather', type: 'http',
      position: { x: 250, y: 80 },
      config: {
        url: 'https://api.open-meteo.com/v1/forecast?latitude=39.9&longitude=116.4&current_weather=true',
        method: 'GET', headers: {}
      },
      label: '获取天气数据'
    },
    {
      id: 'http-exchange', type: 'http',
      position: { x: 250, y: 280 },
      config: {
        url: 'https://open.er-api.com/v6/latest/USD',
        method: 'GET', headers: {}
      },
      label: '获取汇率数据'
    },
    {
      id: 'http-news', type: 'http',
      position: { x: 250, y: 480 },
      config: {
        url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
        method: 'GET', headers: {}
      },
      label: '获取热点新闻'
    },
    {
      id: 'dm-weather', type: 'data-mapper',
      position: { x: 500, y: 80 },
      config: {
        sourceNodeId: 'http-weather',
        mappings: [
          { sourcePath: 'current_weather.temperature', targetName: 'temperature', enabled: true },
          { sourcePath: 'current_weather.windspeed', targetName: 'windspeed', enabled: true },
          { sourcePath: 'current_weather.weathercode', targetName: 'weathercode', enabled: true }
        ]
      },
      label: '提取天气指标'
    },
    {
      id: 'dm-exchange', type: 'data-mapper',
      position: { x: 500, y: 280 },
      config: {
        sourceNodeId: 'http-exchange',
        mappings: [
          { sourcePath: 'rates.CNY', targetName: 'usd_cny', enabled: true },
          { sourcePath: 'rates.EUR', targetName: 'usd_eur', enabled: true },
          { sourcePath: 'rates.JPY', targetName: 'usd_jpy', enabled: true },
          { sourcePath: 'rates.GBP', targetName: 'usd_gbp', enabled: true }
        ]
      },
      label: '提取汇率指标'
    },
    {
      id: 'cond-news', type: 'condition',
      position: { x: 500, y: 480 },
      config: {
        field: { sourceNodeId: 'http-news', path: 'length' },
        operator: 'gt', value: 0
      },
      label: '检查新闻数据'
    },
    {
      id: 'aip-sentiment', type: 'ai-processor',
      position: { x: 750, y: 200 },
      config: {
        instruction: '综合分析以下多源数据，判断市场情绪：1) 天气数据对经济的影响 2) 汇率走势暗示 3) 新闻热度。输出 JSON 格式的市场情绪分析报告，包含 sentiment(positive/neutral/negative), confidence(0-1), key_factors 数组, risk_level(low/medium/high)',
        model: 'GLM-4.7',
        outputFormat: 'json',
        outputSchema: '{ sentiment: string, confidence: number, key_factors: string[], risk_level: string }'
      },
      label: 'AI 情绪综合分析'
    },
    {
      id: 'cond-risk', type: 'condition',
      position: { x: 1000, y: 200 },
      config: {
        field: { sourceNodeId: 'aip-sentiment', path: 'risk_level' },
        operator: 'eq', value: 'high'
      },
      label: '风险评估'
    },
    {
      id: 'llm-alert', type: 'llm',
      position: { x: 1250, y: 100 },
      config: {
        model: 'GLM-4.7',
        systemPrompt: '你是一位资深风险分析师，专门识别市场中的潜在风险信号。请用专业但易懂的语言撰写风险预警报告。',
        prompt: '基于以下市场情报分析结果，撰写一份详细的风险预警报告：\n\n市场情绪：{{aip-sentiment.sentiment}}\n风险等级：{{aip-sentiment.risk_level}}\n关键因素：{{aip-sentiment.key_factors}}\n\n请包含：1. 风险概述 2. 具体风险点 3. 建议应对措施',
        temperature: 0.5
      },
      label: '高风险预警报告'
    },
    {
      id: 'llm-brief', type: 'llm',
      position: { x: 1250, y: 300 },
      config: {
        model: 'GLM-4.7',
        systemPrompt: '你是一位市场分析师，善于从多维度数据中发现投资机会。请撰写积极乐观但基于事实的市场简报。',
        prompt: '基于以下市场情报，撰写一份简洁的市场简报：\n\n市场情绪：{{aip-sentiment.sentiment}}\n置信度：{{aip-sentiment.confidence}}\n关键因素：{{aip-sentiment.key_factors}}\n\n请包含：1. 市场概览 2. 亮点机会 3. 一句话建议',
        temperature: 0.7
      },
      label: '市场简报生成'
    },
    {
      id: 'aip-summary', type: 'ai-processor',
      position: { x: 1500, y: 200 },
      config: {
        instruction: '将上游所有分析结果整合为一份结构化的最终报告。要求输出 JSON 格式，包含 title(报告标题), executive_summary(一句话摘要), sections(数组，每项含 heading 和 content), generated_at(当前时间), data_sources(数据来源列表), footer(注明由 FlowCraft 自动生成)',
        model: 'GLM-4.7',
        outputFormat: 'json',
        outputSchema: '{ title: string, executive_summary: string, sections: [{ heading: string, content: string }], generated_at: string, data_sources: string[], footer: string }'
      },
      label: '最终报告整合'
    },
    {
      id: 'code-format', type: 'code',
      position: { x: 1750, y: 200 },
      config: {
        code: "const report = input;\nconst formatted = {\n  ...report,\n  formatted_at: new Date().toISOString(),\n  version: '2.0',\n  footer: '由 FlowCraft 智能市场情报系统自动生成'\n};\nreturn JSON.stringify(formatted, null, 2);"
      },
      label: '格式化输出'
    },
    {
      id: 'end-1', type: 'end',
      position: { x: 2000, y: 200 }, config: {},
      label: '输出报告'
    }
  ],
  edges: [
    { id: 'e1', source: 'start-1', target: 'http-weather' },
    { id: 'e2', source: 'start-1', target: 'http-exchange' },
    { id: 'e3', source: 'start-1', target: 'http-news' },
    { id: 'e4', source: 'http-weather', target: 'dm-weather' },
    { id: 'e5', source: 'http-exchange', target: 'dm-exchange' },
    { id: 'e6', source: 'http-news', target: 'cond-news' },
    { id: 'e7', source: 'dm-weather', target: 'aip-sentiment' },
    { id: 'e8', source: 'dm-exchange', target: 'aip-sentiment' },
    { id: 'e9', source: 'cond-news', target: 'aip-sentiment', sourceHandle: 'true' },
    { id: 'e10', source: 'aip-sentiment', target: 'cond-risk' },
    { id: 'e11', source: 'cond-risk', target: 'llm-alert', sourceHandle: 'true' },
    { id: 'e12', source: 'cond-risk', target: 'llm-brief', sourceHandle: 'false' },
    { id: 'e13', source: 'llm-alert', target: 'aip-summary' },
    { id: 'e14', source: 'llm-brief', target: 'aip-summary' },
    { id: 'e15', source: 'aip-summary', target: 'code-format' },
    { id: 'e16', source: 'code-format', target: 'end-1' }
  ]
}

async function main() {
  const res = await fetch('http://localhost:3002/api/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow)
  })
  const data = await res.json()
  console.log('Created workflow:', data.id)
  console.log('Name:', data.name)
  console.log('Nodes:', data.definition.nodes.length)
  console.log('Edges:', data.definition.edges.length)
  // Verify Chinese is correct
  for (const n of data.definition.nodes) {
    console.log(`  [${n.type.padEnd(12)}] ${n.label}`)
  }
}

main().catch(err => {
  console.error('Failed:', err.message)
  process.exit(1)
})
