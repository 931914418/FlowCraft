import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useRef, useState, useEffect } from 'react';
import { ReactFlow, Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState, } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Save, Play, ArrowLeft, Webhook, Copy, RefreshCw, ChevronDown, X, Settings } from 'lucide-react';
import { NodePalette } from '@/components/NodePalette';
import { PropertyPanel } from '@/components/PropertyPanel';
import { DebugPanel } from '@/components/DebugPanel';
import { AIChatBar } from '@/components/AIChatBar';
import { AIPreviewPanel } from '@/components/AIPreviewPanel';
import { SettingsSidebar } from '@/components/SettingsSidebar';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import LLMNode from '@/components/nodes/LLMNode';
import ConditionNode from '@/components/nodes/ConditionNode';
import StartNode from '@/components/nodes/StartNode';
import EndNode from '@/components/nodes/EndNode';
import CodeNode from '@/components/nodes/CodeNode';
import HttpNode from '@/components/nodes/HttpNode';
import DataMapperNode from '@/components/nodes/DataMapperNode';
import AIProcessorNode from '@/components/nodes/AIProcessorNode';
import { getWorkflow, saveWorkflow, updateWorkflow, runWorkflow, connectExecutionSSE, } from '@/api/workflow';
const nodeTypes = {
    start: StartNode,
    end: EndNode,
    llm: LLMNode,
    condition: ConditionNode,
    code: CodeNode,
    http: HttpNode,
    'data-mapper': DataMapperNode,
    'ai-processor': AIProcessorNode,
};
const DEFAULT_LABELS = {
    start: 'Start',
    end: 'End',
    llm: 'LLM',
    condition: 'Condition',
    code: 'Code',
    http: 'HTTP',
    'data-mapper': 'Data Mapper',
    'ai-processor': 'AI Processor',
};
export default function EditorPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id;
    const [loading, setLoading] = useState(!isNew);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [workflowName, setWorkflowName] = useState('Untitled Workflow');
    const [selectedNode, setSelectedNode] = useState(null);
    const [debugEvents, setDebugEvents] = useState([]);
    const [showDebug, setShowDebug] = useState(false);
    const [triggerType, setTriggerType] = useState('manual');
    const [webhookPath, setWebhookPath] = useState('');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [showWebhookPanel, setShowWebhookPanel] = useState(false);
    const [copied, setCopied] = useState(false);
    const [aiMode, setAiMode] = useState('simple');
    const [aiPreview, setAiPreview] = useState(null);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const reactFlowInstance = useRef(null);
    const workflowIdRef = useRef(id);
    const sseCleanupRef = useRef(null);
    const loadedRef = useRef(false);
    // Load existing workflow
    useEffect(() => {
        if (!id)
            return;
        let cancelled = false;
        loadedRef.current = false;
        setLoading(true);
        getWorkflow(id)
            .then((wf) => {
            if (cancelled)
                return;
            setWorkflowName(wf.name);
            setTriggerType(wf.trigger?.type ?? 'manual');
            setWebhookPath(wf.webhookPath ?? '');
            setWebhookSecret(wf.webhookSecret ?? '');
            setNodes(wf.nodes.map((n) => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: {
                    label: n.label ?? DEFAULT_LABELS[n.type] ?? n.type,
                    config: n.config ?? {},
                },
            })));
            setEdges(wf.edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle ?? undefined,
                label: e.label,
                data: e.condition ? { condition: e.condition } : undefined,
            })));
            // Mark load complete so dirty tracking starts after this render
            loadedRef.current = true;
            setDirty(false);
        })
            .catch((err) => setError(err.message))
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => { cancelled = true; };
    }, [id, setNodes, setEdges]);
    // Track dirty state — skip the initial set from loading
    useEffect(() => {
        if (!loadedRef.current)
            return;
        setDirty(true);
    }, [nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps
    // 组件卸载时清理 SSE 连接
    useEffect(() => {
        return () => {
            sseCleanupRef.current?.();
        };
    }, []);
    // Connection handler — captures sourceHandle as edge condition
    const onConnect = useCallback((connection) => {
        const edgeData = {};
        if (connection.sourceHandle) {
            edgeData.condition = connection.sourceHandle;
        }
        setEdges((eds) => addEdge({
            ...connection,
            data: edgeData,
        }, eds));
    }, [setEdges]);
    // Node selection
    const onNodeClick = useCallback((_, node) => {
        setSelectedNode(node);
    }, []);
    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);
    // Drag and drop from NodePalette
    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);
    const onDrop = useCallback((event) => {
        event.preventDefault();
        const type = event.dataTransfer.getData('application/reactflow');
        if (!type)
            return;
        const position = reactFlowInstance.current?.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        });
        if (!position)
            return;
        const newNode = {
            id: `${type}-${Date.now()}`,
            type,
            position,
            data: { label: DEFAULT_LABELS[type] ?? type },
        };
        setNodes((nds) => [...nds, newNode]);
    }, [setNodes]);
    // Click-to-add fallback
    const handleAddNode = useCallback((type) => {
        const position = { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 };
        const newNode = {
            id: `${type}-${Date.now()}`,
            type,
            position,
            data: { label: DEFAULT_LABELS[type] ?? type },
        };
        setNodes((nds) => [...nds, newNode]);
    }, [setNodes]);
    // AI 生成工作流回调 — 先存预览，不直接应用
    const handleAIGenerate = useCallback((workflow, explanation) => {
        setAiPreview({ workflow, explanation });
    }, []);
    const handleAIApply = useCallback(() => {
        if (!aiPreview)
            return;
        const { workflow } = aiPreview;
        setWorkflowName(workflow.name);
        const xyNodes = workflow.nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position ?? { x: 200 + Math.random() * 300, y: 200 + Math.random() * 200 },
            data: {
                label: DEFAULT_LABELS[n.type] ?? n.type,
                config: n.config ?? {},
            },
        }));
        const xyEdges = workflow.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
        }));
        setNodes(xyNodes);
        setEdges(xyEdges);
        setDirty(true);
        setAiPreview(null);
    }, [aiPreview, setNodes, setEdges]);
    // Webhook helpers
    const generatePath = useCallback(() => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++)
            result += chars[Math.floor(Math.random() * chars.length)];
        setWebhookPath(result);
        setDirty(true);
    }, []);
    const webhookUrl = `${window.location.origin}/api/hooks/${webhookPath}`;
    const copyWebhookUrl = useCallback(() => {
        if (!webhookPath)
            return;
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [webhookUrl, webhookPath]);
    // Update node data from PropertyPanel
    const handleUpdateNode = useCallback((nodeId, data) => {
        setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data } : n)));
        // Also update selectedNode so PropertyPanel reflects changes
        setSelectedNode((prev) => prev && prev.id === nodeId ? { ...prev, data } : prev);
        setDirty(true);
    }, [setNodes]);
    // 节点类型切换：保留位置和连接，清空配置
    const handleChangeNodeType = useCallback((nodeId, newType) => {
        setNodes((nds) => nds.map((n) => {
            if (n.id === nodeId) {
                return {
                    ...n,
                    type: newType,
                    data: {
                        ...n.data,
                        label: DEFAULT_LABELS[newType] || newType,
                        config: {},
                    },
                };
            }
            return n;
        }));
        // 同步更新 selectedNode
        setSelectedNode((prev) => {
            if (!prev || prev.id !== nodeId)
                return prev;
            return {
                ...prev,
                type: newType,
                data: {
                    ...prev.data,
                    label: DEFAULT_LABELS[newType] || newType,
                    config: {},
                },
            };
        });
        setDirty(true);
    }, [setNodes]);
    // Save handler
    const handleSave = useCallback(async () => {
        setSaving(true);
        setError(null);
        try {
            const workflow = {
                name: workflowName,
                trigger: { type: triggerType },
                webhookPath: triggerType === 'webhook' ? webhookPath : undefined,
                webhookSecret: triggerType === 'webhook' ? webhookSecret : undefined,
                nodes: nodes.map((n) => ({
                    id: n.id,
                    type: n.type,
                    position: n.position,
                    config: n.data.config ?? {},
                    label: n.data.label,
                })),
                edges: edges.map((e) => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle ?? undefined,
                    condition: e.data?.condition,
                })),
            };
            if (workflowIdRef.current) {
                await updateWorkflow(workflowIdRef.current, workflow);
            }
            else {
                const saved = await saveWorkflow(workflow);
                if (saved.id) {
                    workflowIdRef.current = saved.id;
                    navigate(`/editor/${saved.id}`, { replace: true });
                }
            }
            setDirty(false);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        }
        finally {
            setSaving(false);
        }
    }, [workflowName, nodes, edges, triggerType, webhookPath, webhookSecret, navigate]);
    // Run handler
    const handleRun = useCallback(async () => {
        if (!workflowIdRef.current)
            return;
        setError(null);
        setDebugEvents([]);
        setShowDebug(true);
        try {
            const { executionId } = await runWorkflow(workflowIdRef.current);
            // Add initial "running" state
            setDebugEvents([{ executionId, nodeId: 'system', nodeType: 'system', status: 'running' }]);
            const cleanup = connectExecutionSSE(executionId, (event) => {
                setDebugEvents((prev) => {
                    const idx = prev.findIndex((e) => e.nodeId === event.nodeId);
                    if (idx >= 0) {
                        const copy = [...prev];
                        copy[idx] = event;
                        return copy;
                    }
                    return [...prev, event];
                });
            }, (e) => {
                // SSE connection error - show user-friendly message
                console.error('SSE connection error:', e);
                const errorMsg = '实时连接失败。执行已完成，但无法实时显示进度。请刷新页面查看最终结果。';
                setError(errorMsg);
                // Add error event to debug panel
                setDebugEvents((prev) => [
                    ...prev,
                    {
                        executionId,
                        nodeId: 'system',
                        nodeType: 'system',
                        status: 'failed',
                        error: errorMsg,
                    },
                ]);
            }, () => {
                // Connection completed normally
                setDebugEvents((prev) => {
                    const filtered = prev.filter((e) => e.nodeId !== 'system');
                    return filtered.length > 0 ? filtered : prev;
                });
            });
            // Store cleanup for unmount
            sseCleanupRef.current = cleanup;
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to run workflow';
            setError(errorMsg);
            setDebugEvents((prev) => [
                ...prev,
                {
                    executionId: workflowIdRef.current,
                    nodeId: 'system',
                    nodeType: 'system',
                    status: 'failed',
                    error: errorMsg,
                },
            ]);
        }
    }, []);
    // Loading state
    if (loading) {
        return (_jsxs("div", { className: "flex h-screen items-center justify-center", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin text-neutral-400" }), _jsx("span", { className: "ml-3 text-neutral-500", children: "Loading workflow..." })] }));
    }
    return (_jsxs("div", { className: "flex h-screen flex-col", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-2", children: [_jsx(Button, { variant: "ghost", size: "icon", onClick: () => navigate('/'), children: _jsx(ArrowLeft, { className: "h-4 w-4" }) }), _jsx("input", { type: "text", value: workflowName, onChange: (e) => { setWorkflowName(e.target.value); setDirty(true); }, className: "border-none bg-transparent text-sm font-medium outline-none focus:ring-0" }), dirty && _jsx("span", { className: "text-xs text-amber-600", children: "Unsaved" }), _jsx(AIChatBar, { onGenerate: handleAIGenerate, mode: aiMode, onModeChange: setAiMode, onLoadingChange: setAiGenerating }), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [_jsx(Button, { variant: "ghost", size: "icon", onClick: () => setShowSettings(true), title: "\u8BBE\u7F6E", children: _jsx(Settings, { className: "h-4 w-4" }) }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => setShowWebhookPanel(!showWebhookPanel), children: [_jsx(Webhook, { className: "mr-1 h-3 w-3" }), triggerType === 'webhook' ? 'Webhook' : 'Manual', _jsx(ChevronDown, { className: "ml-1 h-3 w-3" })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: handleSave, disabled: saving, children: [saving ? _jsx(Loader2, { className: "mr-1 h-3 w-3 animate-spin" }) : _jsx(Save, { className: "mr-1 h-3 w-3" }), "Save"] }), _jsxs(Button, { size: "sm", onClick: handleRun, disabled: !workflowIdRef.current || saving, children: [_jsx(Play, { className: "mr-1 h-3 w-3" }), "Run"] })] })] }), showWebhookPanel && (_jsxs("div", { className: "border-b border-neutral-200 bg-slate-50 px-4 py-3", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("span", { className: "text-sm font-medium text-slate-700", children: "\u89E6\u53D1\u65B9\u5F0F" }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-6 w-6", onClick: () => setShowWebhookPanel(false), children: _jsx(X, { className: "h-3 w-3" }) })] }), _jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsxs("label", { className: "flex items-center gap-1.5 text-sm", children: [_jsx("input", { type: "radio", name: "triggerType", checked: triggerType === 'manual', onChange: () => { setTriggerType('manual'); setDirty(true); } }), "\u624B\u52A8\u89E6\u53D1"] }), _jsxs("label", { className: "flex items-center gap-1.5 text-sm", children: [_jsx("input", { type: "radio", name: "triggerType", checked: triggerType === 'webhook', onChange: () => { setTriggerType('webhook'); setDirty(true); } }), "Webhook"] })] }), triggerType === 'webhook' && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs text-slate-500", children: "Webhook URL" }), _jsxs("div", { className: "mt-1 flex items-center gap-2", children: [_jsx("input", { type: "text", readOnly: true, value: webhookPath ? webhookUrl : '点击生成按钮创建 Webhook URL', className: "flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-600" }), webhookPath && (_jsxs(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 shrink-0", onClick: copyWebhookUrl, children: [_jsx(Copy, { className: "h-3 w-3" }), copied && _jsx("span", { className: "absolute -top-6 text-xs text-green-600", children: "Copied!" })] })), _jsxs(Button, { variant: "outline", size: "sm", className: "shrink-0 text-xs", onClick: generatePath, children: [_jsx(RefreshCw, { className: "mr-1 h-3 w-3" }), webhookPath ? '重新生成' : '生成路径'] })] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-xs text-slate-500", children: "Webhook Secret\uFF08\u53EF\u9009\uFF09" }), _jsx("input", { type: "text", value: webhookSecret, onChange: (e) => { setWebhookSecret(e.target.value); setDirty(true); }, placeholder: "\u7528\u4E8E\u9A8C\u8BC1 Webhook \u8BF7\u6C42\u7684\u5BC6\u94A5", className: "mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs" })] })] }))] })), error && (_jsx("div", { className: "bg-red-50 px-4 py-2 text-sm text-red-700", children: error })), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsx("div", { className: "w-48 border-r border-neutral-200 bg-neutral-50", children: _jsx(NodePalette, { onAddNode: handleAddNode, aiMode: aiMode }) }), _jsxs("div", { className: "relative flex-1", children: [aiGenerating && (_jsx("div", { className: "absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm", children: _jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin text-violet-500" }), _jsx("span", { className: "text-sm font-medium text-violet-600", children: "AI \u6B63\u5728\u751F\u6210\u5DE5\u4F5C\u6D41..." })] }) })), _jsxs(ReactFlow, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, onConnect: onConnect, onNodeClick: onNodeClick, onPaneClick: onPaneClick, onDrop: onDrop, onDragOver: onDragOver, onInit: (instance) => { reactFlowInstance.current = instance; }, nodeTypes: nodeTypes, fitView: true, children: [_jsx(Background, {}), _jsx(Controls, {}), _jsx(MiniMap, {})] })] }), selectedNode && (_jsx(PropertyPanel, { node: selectedNode, onUpdate: handleUpdateNode, onChangeNodeType: handleChangeNodeType, onClose: () => setSelectedNode(null) }, selectedNode.id))] }), showDebug && (_jsx("div", { className: "border-t border-neutral-200 bg-neutral-50", children: _jsx(DebugPanel, { events: debugEvents, onClear: () => setDebugEvents([]), onClose: () => setShowDebug(false) }) })), _jsx(Sheet, { open: !!aiPreview, onClose: () => setAiPreview(null), title: "AI \u751F\u6210\u9884\u89C8", children: aiPreview && (_jsx(AIPreviewPanel, { result: aiPreview.workflow, explanation: aiPreview.explanation, onApply: handleAIApply, onDiscard: () => setAiPreview(null), onRegenerate: () => setAiPreview(null) })) }), _jsx(SettingsSidebar, { open: showSettings, onClose: () => setShowSettings(false) })] }));
}
