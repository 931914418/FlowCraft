import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { NODE_TYPE_META } from '@flowcraft/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, Trash2, X, Clock, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
const STATUS_LABELS = {
    pending: '等待中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    skipped: '已跳过',
};
const statusDotColor = {
    pending: 'bg-neutral-300',
    running: 'bg-green-500 animate-pulse',
    completed: 'bg-blue-500',
    failed: 'bg-red-500',
    skipped: 'bg-neutral-400',
};
const badgeVariant = {
    pending: 'outline',
    running: 'default',
    completed: 'secondary',
    failed: 'destructive',
    skipped: 'outline',
};
function colorizeJson(str) {
    try {
        const parsed = typeof str === 'string' ? JSON.parse(str) : str;
        const formatted = JSON.stringify(parsed, null, 2);
        return formatted.split('\n').map((line, i) => (_jsx("div", { className: "whitespace-pre", children: colorizeLine(line) }, i)));
    }
    catch {
        return _jsx("span", { children: str });
    }
}
function colorizeLine(line) {
    const parts = [];
    let key = 0;
    const regex = /("(?:[^"\\]|\\.)*")\s*:/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) {
            parts.push(_jsx("span", { children: line.slice(lastIndex, match.index) }, key++));
        }
        parts.push(_jsx("span", { className: "text-violet-600", children: match[1] }, key++));
        parts.push(_jsx("span", { children: ':' }, key++));
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) {
        const rest = line.slice(lastIndex);
        const valueRegex = /("(?:[^"\\]|\\.)*")|(\b\d+\.?\d*\b)|(\btrue\b|\bfalse\b|\bnull\b)/g;
        let vLast = 0;
        let vMatch;
        while ((vMatch = valueRegex.exec(rest)) !== null) {
            if (vMatch.index > vLast) {
                parts.push(_jsx("span", { children: rest.slice(vLast, vMatch.index) }, key++));
            }
            if (vMatch[1])
                parts.push(_jsx("span", { className: "text-green-600", children: vMatch[1] }, key++));
            else if (vMatch[2])
                parts.push(_jsx("span", { className: "text-blue-600", children: vMatch[2] }, key++));
            else if (vMatch[3])
                parts.push(_jsx("span", { className: "text-amber-600", children: vMatch[3] }, key++));
            vLast = vMatch.index + vMatch[0].length;
        }
        if (vLast < rest.length)
            parts.push(_jsx("span", { children: rest.slice(vLast) }, key++));
    }
    return parts.length > 0 ? parts : line;
}
export function DebugPanel({ events, onClear, onClose }) {
    if (events.length === 0) {
        return (_jsx("div", { className: "px-4 py-2", children: _jsx("div", { className: "flex items-center justify-center p-4 text-sm text-neutral-400", children: "\u70B9\u51FB Run \u6309\u94AE\u5F00\u59CB\u6267\u884C\u5DE5\u4F5C\u6D41..." }) }));
    }
    const systemError = events.find(e => e.nodeId === 'system' && e.status === 'failed');
    if (systemError && events.length === 1) {
        return (_jsx("div", { className: "px-4 py-2", children: _jsxs("div", { className: "rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700", children: [_jsx("div", { className: "font-medium", children: "\u8FDE\u63A5\u5931\u8D25" }), _jsx("div", { className: "mt-1", children: systemError.error || '无法连接到执行服务器' }), _jsx("div", { className: "mt-2 text-xs text-red-600", children: "\u63D0\u793A\uFF1A\u5DE5\u4F5C\u6D41\u53EF\u80FD\u5DF2\u5728\u540E\u53F0\u6267\u884C\u5B8C\u6210\u3002\u8BF7\u5237\u65B0\u9875\u9762\u67E5\u770B\u6700\u65B0\u7ED3\u679C\u3002" })] }) }));
    }
    const nodeEvents = events.filter(e => e.nodeId !== 'system');
    const totalMs = nodeEvents.reduce((sum, e) => sum + (e.durationMs ?? 0), 0);
    const totalTokens = nodeEvents.reduce((sum, e) => sum + (e.tokens ?? 0), 0);
    const completedCount = nodeEvents.filter(e => e.status === 'completed').length;
    const failedCount = nodeEvents.filter(e => e.status === 'failed').length;
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3 border-b border-neutral-100 px-4 py-2", children: [_jsxs("div", { className: "flex items-center gap-1.5 text-xs text-neutral-500", children: [_jsx(Clock, { className: "h-3 w-3" }), _jsx("span", { children: totalMs > 1000 ? `${(totalMs / 1000).toFixed(1)}s` : `${totalMs}ms` })] }), totalTokens > 0 && (_jsxs("div", { className: "flex items-center gap-1.5 text-xs text-neutral-500", children: [_jsx(Zap, { className: "h-3 w-3" }), _jsxs("span", { children: [totalTokens, " tokens"] })] })), completedCount > 0 && (_jsxs("div", { className: "flex items-center gap-1 text-xs", children: [_jsx(CheckCircle2, { className: "h-3 w-3 text-green-500" }), _jsx("span", { className: "text-green-600", children: completedCount })] })), failedCount > 0 && (_jsxs("div", { className: "flex items-center gap-1 text-xs", children: [_jsx(XCircle, { className: "h-3 w-3 text-red-500" }), _jsx("span", { className: "text-red-600", children: failedCount })] })), _jsxs("div", { className: "ml-auto flex items-center gap-1", children: [onClear && (_jsxs(Button, { variant: "ghost", size: "sm", className: "h-6 text-xs text-neutral-400", onClick: onClear, children: [_jsx(Trash2, { className: "mr-1 h-3 w-3" }), "\u6E05\u7A7A"] })), onClose && (_jsx(Button, { variant: "ghost", size: "sm", className: "h-6 text-xs text-neutral-400", onClick: onClose, children: _jsx(X, { className: "h-3 w-3" }) }))] })] }), _jsx(ScrollArea, { className: "max-h-96", children: _jsx("div", { className: "space-y-0 p-3 pl-4", children: nodeEvents.map((event, index) => (_jsx(TimelineItem, { event: event, isLast: index === nodeEvents.length - 1 }, `${event.nodeId}-${event.executionId}`))) }) })] }));
}
function TimelineItem({ event, isLast }) {
    const [expanded, setExpanded] = useState(false);
    const nodeLabel = NODE_TYPE_META[event.nodeType]?.label ?? event.nodeType;
    return (_jsxs("div", { className: "flex", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: cn('h-3 w-3 rounded-full border-2 border-white shadow-sm', statusDotColor[event.status] ?? 'bg-neutral-300') }), !isLast && _jsx("div", { className: "w-px flex-1 bg-neutral-200" })] }), _jsxs("div", { className: "ml-3 flex-1 pb-3", children: [_jsxs("button", { className: "flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm transition-colors hover:bg-neutral-50", onClick: () => setExpanded(!expanded), children: [expanded ? (_jsx(ChevronDown, { className: "h-3 w-3 text-neutral-400" })) : (_jsx(ChevronRight, { className: "h-3 w-3 text-neutral-400" })), _jsx("span", { className: "font-medium text-neutral-700", children: event.nodeId }), _jsx("span", { className: "text-xs text-neutral-400", children: nodeLabel }), _jsx(Badge, { variant: badgeVariant[event.status] ?? 'outline', className: "text-[10px]", children: STATUS_LABELS[event.status] ?? event.status }), event.durationMs != null && (_jsxs("span", { className: "ml-auto text-xs text-neutral-400", children: [event.durationMs, "ms"] }))] }), expanded && (_jsxs("div", { className: "mt-1 space-y-1.5 pl-6 text-xs", children: [event.error && (_jsx("div", { className: "rounded border border-red-200 bg-red-50 px-2 py-1.5 text-red-700", children: event.error })), event.output && (_jsx("pre", { className: "max-h-48 overflow-auto rounded-md bg-neutral-900 p-2 font-mono text-xs leading-relaxed text-neutral-100", children: colorizeJson(event.output) })), event.tokens != null && event.tokens > 0 && (_jsxs("div", { className: "flex items-center gap-1 text-neutral-400", children: [_jsx(Zap, { className: "h-3 w-3" }), "Token: ", event.tokens] }))] }))] })] }));
}
