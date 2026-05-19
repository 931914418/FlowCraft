export type NodeType = 'start' | 'end' | 'llm' | 'condition' | 'code' | 'http' | 'data-mapper' | 'ai-processor'

export type TriggerType = 'manual' | 'cron' | 'webhook'

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface Position {
  x: number
  y: number
}

export interface WorkflowNode {
  id: string
  type: NodeType
  position: Position
  config: Record<string, unknown>
  label?: string
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  label?: string
  sourceHandle?: string
  condition?: string
}

export interface WorkflowDefinition {
  id?: string
  name: string
  version?: number
  trigger?: { type: TriggerType; cron?: string }
  webhookPath?: string
  webhookSecret?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface NodeExecutionEvent {
  executionId: string
  nodeId: string
  nodeType: NodeType
  status: ExecutionStatus
  output?: string
  tokens?: number
  durationMs?: number
  error?: string
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: ToolParam[]
}

export interface ToolParam {
  name: string
  type: 'string' | 'number' | 'boolean' | 'json'
  required: boolean
  description: string
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  modelId: string
  enabled: boolean
}

export const NODE_TYPE_META: Record<NodeType, { icon: string; label: string; color: string; description: string }> = {
  start: { icon: 'PlayCircle', label: 'Start', color: 'text-green-500', description: '工作流入口，定义触发数据' },
  end: { icon: 'Square', label: 'End', color: 'text-red-500', description: '工作流终点，输出最终结果' },
  llm: { icon: 'bot', label: 'LLM', color: 'text-blue-500', description: '调用大语言模型生成文本' },
  condition: { icon: 'git-branch', label: 'Condition', color: 'text-amber-500', description: '根据条件分支执行路径' },
  code: { icon: 'code', label: 'Code', color: 'text-purple-500', description: '运行自定义 JavaScript 代码（高级模式）' },
  http: { icon: 'globe', label: 'HTTP', color: 'text-cyan-500', description: '调用外部 API 接口' },
  'data-mapper': { icon: 'table-2', label: 'Data Mapper', color: 'cyan-500', description: '提取和映射上游数据字段' },
  'ai-processor': { icon: 'sparkles', label: 'AI Processor', color: 'purple-500', description: 'AI 处理节点，支持自定义指令和输出格式' },
}
