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
import { Loader2, Save, Play, ArrowLeft } from 'lucide-react'

import { NodePalette } from '@/components/NodePalette'
import { PropertyPanel } from '@/components/PropertyPanel'
import { DebugPanel } from '@/components/DebugPanel'
import { Button } from '@/components/ui/button'

import LLMNode from '@/components/nodes/LLMNode'
import ConditionNode from '@/components/nodes/ConditionNode'
import StartNode from '@/components/nodes/StartNode'
import EndNode from '@/components/nodes/EndNode'
import CodeNode from '@/components/nodes/CodeNode'
import HttpNode from '@/components/nodes/HttpNode'

import {
  getWorkflow,
  saveWorkflow,
  updateWorkflow,
  runWorkflow,
  connectExecutionSSE,
} from '@/api/workflow'
import type { NodeType, NodeExecutionEvent } from '@flowcraft/shared'

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  llm: LLMNode,
  condition: ConditionNode,
  code: CodeNode,
  http: HttpNode,
}

const DEFAULT_LABELS: Record<string, string> = {
  start: 'Start',
  end: 'End',
  llm: 'LLM',
  condition: 'Condition',
  code: 'Code',
  http: 'HTTP',
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

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const reactFlowInstance = useRef<ReactFlowInstance>(null)
  const workflowIdRef = useRef<string | undefined>(id)

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
        setNodes(
          wf.nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: { label: n.label ?? DEFAULT_LABELS[n.type] ?? n.type, ...n.config },
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

  // Save handler
  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const workflow = {
        name: workflowName,
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
  }, [workflowName, nodes, edges, navigate])

  // Run handler
  const handleRun = useCallback(async () => {
    if (!workflowIdRef.current) return
    setError(null)
    setDebugEvents([])
    setShowDebug(true)
    try {
      const { executionId } = await runWorkflow(workflowIdRef.current)
      const cleanup = connectExecutionSSE(executionId, (event) => {
        setDebugEvents((prev) => {
          const idx = prev.findIndex((e) => e.nodeId === event.nodeId)
          if (idx >= 0) {
            const copy = [...prev]
            copy[idx] = event
            return copy
          }
          return [...prev, event]
        })
      }, (e) => {
        console.error('SSE error', e)
      })
      // cleanup will be called when EventSource closes itself
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run')
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
        <div className="ml-auto flex items-center gap-2">
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

      {error && (
        <div className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — Node palette */}
        <div className="w-48 border-r border-neutral-200 bg-neutral-50">
          <NodePalette onAddNode={handleAddNode} />
        </div>

        {/* Canvas */}
        <div className="flex-1">
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
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {/* Debug panel */}
      {showDebug && (
        <div className="border-t border-neutral-200 bg-neutral-50">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Execution Log
            </span>
            <Button variant="ghost" size="sm" onClick={() => setShowDebug(false)}>
              Close
            </Button>
          </div>
          <DebugPanel events={debugEvents} />
        </div>
      )}
    </div>
  )
}
