import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { API_BASE } from '@/lib/api-config';
export function AIChatBar({ onGenerate, mode, onModeChange, onLoadingChange }) {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const containerRef = useRef(null);
    // Dismiss error on outside click
    useEffect(() => {
        if (!error)
            return;
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setError(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [error]);
    const handleGenerate = useCallback(async () => {
        if (!input.trim() || loading)
            return;
        setLoading(true);
        setError(null);
        onLoadingChange?.(true);
        try {
            const res = await fetch(`${API_BASE}/ai/generate-workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: input.trim(), mode }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || '生成失败');
                return;
            }
            onGenerate(data.workflow, data.explanation || '');
            setInput('');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '网络错误');
        }
        finally {
            setLoading(false);
            onLoadingChange?.(false);
        }
    }, [input, loading, mode, onGenerate, onLoadingChange]);
    return (_jsxs("div", { ref: containerRef, className: "relative flex items-center gap-2", children: [_jsxs("div", { className: "flex flex-col", children: [_jsxs("div", { className: "flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-1 py-0.5", children: [_jsx("button", { type: "button", className: `rounded-md px-2 py-1 text-xs font-medium transition-colors ${mode === 'simple'
                                    ? 'bg-white text-neutral-900 shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-700'}`, onClick: () => onModeChange('simple'), children: "\u7B80\u5355" }), _jsx("button", { type: "button", className: `rounded-md px-2 py-1 text-xs font-medium transition-colors ${mode === 'advanced'
                                    ? 'bg-white text-neutral-900 shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-700'}`, onClick: () => onModeChange('advanced'), children: "\u9AD8\u7EA7" })] }), _jsx("span", { className: "mt-0.5 text-center text-[10px] text-neutral-400", children: mode === 'simple' ? '自动过滤代码节点' : '支持所有节点类型' })] }), _jsxs("div", { className: "flex flex-1 items-center gap-2", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Sparkles, { className: "absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400" }), _jsx(Input, { value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleGenerate();
                                    }
                                }, placeholder: "\u63CF\u8FF0\u4F60\u60F3\u521B\u5EFA\u7684\u5DE5\u4F5C\u6D41...", className: "pl-9", disabled: loading })] }), _jsxs(Button, { size: "sm", onClick: handleGenerate, disabled: loading || !input.trim(), className: "bg-violet-600 hover:bg-violet-700", children: [loading ? (_jsx(Loader2, { className: "mr-1 h-4 w-4 animate-spin" })) : (_jsx(Wand2, { className: "mr-1 h-4 w-4" })), loading ? '生成中...' : '生成'] })] }), error && (_jsxs("div", { className: "absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-600 shadow-lg", children: [error, _jsx("button", { type: "button", onClick: () => setError(null), className: "ml-2 text-red-400 hover:text-red-600", children: "\u00D7" })] }))] }));
}
