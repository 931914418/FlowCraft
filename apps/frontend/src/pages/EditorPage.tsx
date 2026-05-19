import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, Save, Play, ArrowLeft, Webhook, Copy, RefreshCw, ChevronDown, X } from 'lucide-react'

import { NodePalette } from '@/components/NodePalette'
import { PropertyPanel } from '@/components/PropertyPanel'
import { DebugPanel } from '@/components/DebugPanel'
import { AIChatBar, type AIWorkflowResult } from '@/components/AIChatBar'
import { AIPreviewPanel } from '@/components/AIPreviewPanel'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

import LLMNode from '@/components/nodes/LLMNode'
import ConditionNode from '@/components/nodes/ConditionNode'
import StartNode from '@/components/nodes/StartNode'
import EndNode from '@/components/nodes/EndNode'
import CodeNode from '@/components/nodes/CodeNode'
import HttpNode from '@/components/nodes/HttpNode'
import DataMapperNode from '@/components/nodes/DataMapperNode'
import AIProcessorNode from '@/components/nodes/AIProcessorNode'

import {
  getWorkflow,
  saveWorkflow,
  updateWorkflow,
  runWorkflow,
  connectExecutionSSE,
} from '@/api/workflow'
import type { NodeType, NodeExecutionEvent, ExecutionStatus, TriggerType } from '@flowcraft/shared'

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  llm: LLMNode,
  condition: ConditionNode,
  code: CodeNode,
  http: HttpNode,
  'data-mapper': DataMapperNode,
  'ai-processor': AIProcessorNode,
}

const DEFAULT_LABELS: Record<string, string> = {
  start: 'Start',
  end: 'End',
  llm: 'LLM',
  condition: 'Condition',
  code: 'Code',
  http: 'HTTP',
  'data-mapper': 'Data Mapper',
  'ai-processor': 'AI Processor',
}

export default function EditorPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isNew = !id

  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [workflowName, setWorkflowName] = useState('Untitled Workflow')
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [debugEvents, setDebugEvents] = useState<NodeExecutionEvent[]>([])
  const [showDebug, setShowDebug] = useState(false)
  const [triggerType, setTriggerType] = useState<TriggerType>('manual')
  const [webhookPath, setWebhookPath] = useState<string>('')
  const [webhookSecret, setWebhookSecret] = useState<string>('')
  const [showWebhookPanel, setShowWebhookPanel] = useState(false)
  const [copied, setCopied] = useState(false)
  const [aiMode, setAiMode] = useState<'simple' | 'advanced'>('simple')
  const [aiPreview, setAiPreview] = useState<{
    workflow: AIWorkflowResult
    explanation: string
  } | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const reactFlowInstance = useRef<ReactFlowInstance>(null)
  const workflowIdRef = useRef<string | undefined>(id)
  const sseCleanupRef = useRef<(() => void) | null>(null)

  const loadedRef = useRef(false)

  // Load existing workflow
  useEffect(() => {
    if (!id) return
    let cancelled = false
    loadedRef.current = false
    setLoading(true)
    getWorkflow(id)
      .then((wf) => {
        if (cancelled) return
        setWorkflowName(wf.name)
        setTriggerType(wf.trigger?.type ?? 'manual')
        setWebhookPath(wf.webhookPath ?? '')
        setWebhookSecret(wf.webhookSecret ?? '')
        setNodes(
          wf.nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: {
              label: n.label ?? DEFAULT_LABELS[n.type] ?? n.type,
              config: n.config ?? {},
            },
          }))
        )
        setEdges(
          wf.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle ?? undefined,
            label: e.label,
            data: e.condition ? { condition: e.condition } : undefined,
          }))
        )
        // Mark load complete so dirty tracking starts after this render
        loadedRef.current = true
        setDirty(false)
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id, setNodes, setEdges])

  // Track dirty state — skip the initial set from loading
  useEffect(() => {
    if (!loadedRef.current) return
    setDirty(true)
  }, [nodes, edges]) // eslint-disable-line react-hooks/exhaustive-deps

  // 组件卸载时清理 SSE 连接
  useEffect(() => {
    return () => {
      sseCleanupRef.current?.()
    }
  }, [])

  // Connection handler — captures sourceHandle as edge condition
  const onConnect = useCallback(
    (connection: Connection) => {
      const edgeData: Record<string, unknown> = {}
      if (connection.sourceHandle) {
        edgeData.condition = connection.sourceHandle
      }
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            data: edgeData,
          },
          eds
        )
      )
    },
    [setEdges]
  )

  // Node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  // Drag and drop from NodePalette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow') as NodeType
      if (!type) return

      const position = reactFlowInstance.current?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      if (!position) return

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: DEFAULT_LABELS[type] ?? type },
      }
      setNodes((nds) => [...nds, newNode])
    },
    [setNodes]
  )

  // Click-to-add fallback
  const handleAddNode = useCallback(
    (type: NodeType) => {
      const position = { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 }
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: DEFAULT_LABELS[type] ?? type },
      }
      setNodes((nds) => [...nds, newNode])
    },
    [setNodes]
  )

  // AI 生成工作流回调 — 先存预览，不直接应用
  const handleAIGenerate = useCallback(
    (workflow: AIWorkflowResult, explanation: string) => {
      setAiPreview({ workflow, explanation })
    },
    []
  )

  const handleAIApply = useCallback(() => {
    if (!aiPreview) return
    const { workflow } = aiPreview
    setWorkflowName(workflow.name)
    const xyNodes = workflow.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position ?? { x: 200 + Math.random() * 300, y: 200 + Math.random() * 200 },
      data: {
        label: DEFAULT_LABELS[n.type] ?? n.type,
        config: n.config ?? {},
      },
    }))
    const xyEdges = workflow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }))
    setNodes(xyNodes)
    setEdges(xyEdges)
    setDirty(true)
    setAiPreview(null)
  }, [aiPreview, setNodes, setEdges])

  // Webhook helpers
  const generatePath = useCallback(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)]
    setWebhookPath(result)
    setDirty(true)
  }, [])

  const webhookUrl = `${window.location.origin}/api/hooks/${webhookPath}`

  const copyWebhookUrl = useCallback(() => {
    if (!webhookPath) return
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [webhookUrl, webhookPath])

  // Update node data from PropertyPanel
  const handleUpdateNode = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n))
      )
      // Also update selectedNode so PropertyPanel reflects changes
      setSelectedNode((prev) =>
        prev && prev.id === nodeId ? { ...prev, data } : prev
      )
      setDirty(true)
    },
    [setNodes]
  )

  // 节点类型切换：保留位置和连接，清空配置
  const handleChangeNodeType = useCallback((nodeId: string, newType: string) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            type: newType,
            data: {
              ...n.data,
              label: DEFAULT_LABELS[newType] || newType,
              config: {},
            },
          }
        }
        return n
      })
    )
    // 同步更新 selectedNode
    setSelectedNode((prev) => {
      if (!prev || prev.id !== nodeId) return prev
      return {
        ...prev,
        type: newType,
        data: {
          ...prev.data,
          label: DEFAULT_LABELS[newType] || newType,
          config: {},
        },
      }
    })
    setDirty(true)
  }, [setNodes])

  // Save handler
  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const workflow = {
        name: workflowName,
        trigger: { type: triggerType } as const,
        webhookPath: triggerType === 'webhook' ? webhookPath : undefined,
        webhookSecret: triggerType === 'webhook' ? webhookSecret : undefined,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type as NodeType,
          position: n.position,
          config: (n.data as Record<string, unknown>).config as Record<string, unknown> ?? {},
          label: (n.data as Record<string, unknown>).label as string,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
          condition: (e.data as Record<string, unknown>)?.condition as string | undefined,
        })),
      }

      if (workflowIdRef.current) {
        await updateWorkflow(workflowIdRef.current, workflow)
      } else {
        const saved = await saveWorkflow(workflow)
        if (saved.id) {
          workflowIdRef.current = saved.id
          navigate(`/editor/${saved.id}`, { replace: true })
        }
      }
      setDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [workflowName, nodes, edges, triggerType, webhookPath, webhookSecret, navigate])

  // Run handler
  const handleRun = useCallback(async () => {
    if (!workflowIdRef.current) return
    setError(null)
    setDebugEvents([])
    setShowDebug(true)

    try {
      const { executionId } = await runWorkflow(workflowIdRef.current)

      // Add initial "running" state
      setDebugEvents([{ executionId, nodeId: 'system', nodeType: 'system' as NodeType, status: 'running' as ExecutionStatus }])

      const cleanup = connectExecutionSSE(
        executionId,
        (event) => {
          setDebugEvents((prev) => {
            const idx = prev.findIndex((e) => e.nodeId === event.nodeId)
            if (idx >= 0) {
              const copy = [...prev]
              copy[idx] = event
              return copy
            }
            return [...prev, event]
          })
        },
        (e) => {
          // SSE connection error - show user-friendly message
          console.error('SSE connection error:', e)
          const errorMsg = '实时连接失败。执行已完成，但无法实时显示进度。请刷新页面查看最终结果。'
          setError(errorMsg)

          // Add error event to debug panel
          setDebugEvents((prev) => [
            ...prev,
            {
              executionId,
              nodeId: 'system',
              nodeType: 'system' as NodeType,
              status: 'failed' as ExecutionStatus,
              error: errorMsg,
            },
          ])
        },
        () => {
          // Connection completed normally
          setDebugEvents((prev) => {
            const filtered = prev.filter((e) => e.nodeId !== 'system')
            return filtered.length > 0 ? filtered : prev
          })
        }
      )

      // Store cleanup for unmount
      sseCleanupRef.current = cleanup
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to run workflow'
      setError(errorMsg)
      setDebugEvents((prev) => [
        ...prev,
        {
          executionId: workflowIdRef.current!,
          nodeId: 'system',
          nodeType: 'system' as NodeType,
          status: 'failed' as ExecutionStatus,
          error: errorMsg,
        },
      ])
    }
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        <span className="ml-3 text-neutral-500">Loading workflow...</span>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <input
          type="text"
          value={workflowName}
          onChange={(e) => { setWorkflowName(e.target.value); setDirty(true) }}
          className="border-none bg-transparent text-sm font-medium outline-none focus:ring-0"
        />
        {dirty && <span className="text-xs text-amber-600">Unsaved</span>}
        <AIChatBar
          onGenerate={handleAIGenerate}
          mode={aiMode}
          onModeChange={setAiMode}
          onLoadingChange={setAiGenerating}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWebhookPanel(!showWebhookPanel)}
          >
            <Webhook className="mr-1 h-3 w-3" />
            {triggerType === 'webhook' ? 'Webhook' : 'Manual'}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
            Save
          </Button>
          <Button size="sm" onClick={handleRun} disabled={!workflowIdRef.current || saving}>
            <Play className="mr-1 h-3 w-3" />
            Run
          </Button>
        </div>
      </div>

      {/* Webhook config panel */}
      {showWebhookPanel && (
        <div className="border-b border-neutral-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700">触发方式</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowWebhookPanel(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="triggerType"
                checked={triggerType === 'manual'}
                onChange={() => { setTriggerType('manual'); setDirty(true) }}
              />
              手动触发
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="triggerType"
                checked={triggerType === 'webhook'}
                onChange={() => { setTriggerType('webhook'); setDirty(true) }}
              />
              Webhook
            </label>
          </div>
          {triggerType === 'webhook' && (
            <div className="space-y-2">
              <div>
                <span className="text-xs text-slate-500">Webhook URL</span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookPath ? webhookUrl : '点击生成按钮创建 Webhook URL'}
                    className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-600"
                  />
                  {webhookPath && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyWebhookUrl}>
                      <Copy className="h-3 w-3" />
                      {copied && <span className="absolute -top-6 text-xs text-green-600">Copied!</span>}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={generatePath}>
                    <RefreshCw className="mr-1 h-3 w-3" />
                    {webhookPath ? '重新生成' : '生成路径'}
                  </Button>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500">Webhook Secret（可选）</span>
                <input
                  type="text"
                  value={webhookSecret}
                  onChange={(e) => { setWebhookSecret(e.target.value); setDirty(true) }}
                  placeholder="用于验证 Webhook 请求的密钥"
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — Node palette */}
        <div className="w-48 border-r border-neutral-200 bg-neutral-50">
          <NodePalette onAddNode={handleAddNode} aiMode={aiMode} />
        </div>

        {/* Canvas */}
        <div className="relative flex-1">
          {/* AI generating overlay */}
          {aiGenerating && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <span className="text-sm font-medium text-violet-600">AI 正在生成工作流...</span>
              </div>
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={(instance) => { reactFlowInstance.current = instance }}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Right sidebar — Property panel */}
        {selectedNode && (
          <PropertyPanel
            key={selectedNode.id}
            node={selectedNode}
            onUpdate={handleUpdateNode}
            onChangeNodeType={handleChangeNodeType}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {/* Debug panel */}
      {showDebug && (
        <div className="border-t border-neutral-200 bg-neutral-50">
          <DebugPanel
            events={debugEvents}
            onClear={() => setDebugEvents([])}
            onClose={() => setShowDebug(false)}
          />
        </div>
      )}

      {/* AI Preview Sheet */}
      <Sheet
        open={!!aiPreview}
        onClose={() => setAiPreview(null)}
        title="AI 生成预览"
      >
        {aiPreview && (
          <AIPreviewPanel
            result={aiPreview.workflow}
            explanation={aiPreview.explanation}
            onApply={handleAIApply}
            onDiscard={() => setAiPreview(null)}
            onRegenerate={() => setAiPreview(null)}
          />
        )}
      </Sheet>
    </div>
  )
}
