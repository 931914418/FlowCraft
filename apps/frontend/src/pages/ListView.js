import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Loader2, AlertCircle, Search, Sparkles, Zap, Clock, Globe } from 'lucide-react';
import { listWorkflows, deleteWorkflow } from '@/api/workflow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
const TRIGGER_LABELS = {
    manual: { label: '手动', icon: Zap },
    webhook: { label: 'Webhook', icon: Globe },
    cron: { label: '定时', icon: Clock },
};
export default function ListView() {
    const navigate = useNavigate();
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const loadWorkflows = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listWorkflows();
            setWorkflows(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load workflows');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        loadWorkflows();
    }, [loadWorkflows]);
    const filtered = useMemo(() => workflows.filter((wf) => wf.name.toLowerCase().includes(search.toLowerCase())), [workflows, search]);
    const handleCreate = () => {
        navigate('/editor');
    };
    const handleAiCreate = () => {
        alert('AI 创建功能即将上线，敬请期待！');
    };
    const handleDelete = async (id, name) => {
        if (!window.confirm(`确定删除「${name}」？此操作不可撤销。`))
            return;
        try {
            await deleteWorkflow(id);
            setWorkflows((prev) => prev.filter((wf) => wf.id !== id));
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
        }
    };
    // Loading state
    if (loading) {
        return (_jsxs("div", { className: "flex h-screen items-center justify-center", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin text-slate-400" }), _jsx("span", { className: "ml-3 text-slate-400", children: "Loading workflows..." })] }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-slate-50", children: [_jsx("header", { className: "border-b border-slate-200 bg-white", children: _jsxs("div", { className: "mx-auto flex max-w-5xl items-center justify-between px-6 py-4", children: [_jsx("h1", { className: "text-xl font-bold tracking-tight text-slate-700", children: "FlowCraft" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { onClick: handleCreate, children: [_jsx(Plus, { className: "mr-1.5 h-4 w-4" }), "\u65B0\u5EFA"] }), _jsxs(Button, { variant: "outline", onClick: handleAiCreate, children: [_jsx(Sparkles, { className: "mr-1.5 h-4 w-4" }), "AI \u521B\u5EFA"] })] })] }) }), _jsxs("div", { className: "mx-auto max-w-5xl px-6 py-6", children: [error && (_jsxs("div", { className: "mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700", children: [_jsx(AlertCircle, { className: "h-4 w-4 shrink-0" }), error] })), workflows.length > 0 && (_jsxs("div", { className: "relative mb-5", children: [_jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" }), _jsx(Input, { className: "pl-9", placeholder: "\u641C\u7D22\u5DE5\u4F5C\u6D41...", value: search, onChange: (e) => setSearch(e.target.value) })] })), workflows.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-24 text-center", children: [_jsx("div", { className: "mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100", children: _jsx(Sparkles, { className: "h-7 w-7 text-slate-400" }) }), _jsx("h2", { className: "text-lg font-medium text-slate-700", children: "\u8FD8\u6CA1\u6709\u5DE5\u4F5C\u6D41" }), _jsx("p", { className: "mt-2 max-w-xs text-sm text-slate-400", children: "\u7528 AI \u63CF\u8FF0\u9700\u6C42\uFF0C\u5E2E\u4F60\u521B\u5EFA\u7B2C\u4E00\u4E2A\u5DE5\u4F5C\u6D41" }), _jsxs("div", { className: "mt-6 flex items-center gap-3", children: [_jsxs(Button, { onClick: handleCreate, children: [_jsx(Plus, { className: "mr-1.5 h-4 w-4" }), "\u65B0\u5EFA"] }), _jsxs(Button, { variant: "outline", onClick: handleAiCreate, children: [_jsx(Sparkles, { className: "mr-1.5 h-4 w-4" }), "AI \u521B\u5EFA"] })] })] })) : filtered.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 text-center", children: [_jsx(Search, { className: "mb-3 h-8 w-8 text-slate-300" }), _jsx("p", { className: "text-sm text-slate-400", children: "\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u5DE5\u4F5C\u6D41" })] })) : (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: filtered.map((wf) => {
                            const nodeCount = wf.nodes?.length ?? 0;
                            const triggerType = wf.trigger?.type ?? 'manual';
                            const triggerInfo = TRIGGER_LABELS[triggerType] ?? TRIGGER_LABELS.manual;
                            const TriggerIcon = triggerInfo.icon;
                            return (_jsx(Card, { className: "cursor-pointer rounded-lg border-slate-200 transition-shadow hover:shadow-md", onClick: () => navigate(`/editor/${wf.id}`), children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("div", { className: "min-w-0 flex-1", children: _jsx("h3", { className: "truncate font-medium text-slate-700", children: wf.name || 'Untitled' }) }), _jsx(Button, { variant: "ghost", size: "icon", className: "shrink-0 text-slate-400 hover:text-red-600", onClick: (e) => {
                                                        e.stopPropagation();
                                                        handleDelete(wf.id, wf.name);
                                                    }, children: _jsx(Trash2, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-1.5", children: [_jsxs(Badge, { variant: "secondary", className: "text-xs", children: [nodeCount, " ", nodeCount === 1 ? 'node' : 'nodes'] }), _jsxs(Badge, { variant: "outline", className: "gap-1 text-xs", children: [_jsx(TriggerIcon, { className: "h-3 w-3" }), triggerInfo.label] })] }), _jsxs("div", { className: "mt-3 flex items-center gap-1.5 text-xs text-slate-400", children: [_jsx("span", { className: "inline-block h-1.5 w-1.5 rounded-full bg-slate-300" }), "\u4ECE\u672A\u8FD0\u884C"] })] }) }, wf.id));
                        }) }))] })] }));
}
