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

export const NODE_TYPE_META: Record<NodeType, { icon: string; label: string; color: string }> = {
  start: { icon: 'PlayCircle', label: 'Start', color: 'text-green-500' },
  end: { icon: 'Square', label: 'End', color: 'text-red-500' },
  llm: { icon: 'bot', label: 'LLM', color: 'text-blue-500' },
  condition: { icon: 'git-branch', label: 'Condition', color: 'text-amber-500' },
  code: { icon: 'code', label: 'Code', color: 'text-purple-500' },
  http: { icon: 'globe', label: 'HTTP', color: 'text-cyan-500' },
  'data-mapper': { icon: 'table-2', label: 'Data Mapper', color: 'cyan-500' },
  'ai-processor': { icon: 'sparkles', label: 'AI Processor', color: 'purple-500' },
}
