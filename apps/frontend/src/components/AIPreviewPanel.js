import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NODE_TYPE_META } from '@flowcraft/shared';
import { Button } from '@/components/ui/button';
import { getNodeColor } from '@/lib/node-theme';
import { PlayCircle, Square, Bot, GitBranch, Code, Globe, Table2, Sparkles, Wand2, X, RefreshCw, ArrowRight, } from 'lucide-react';
const ICON_MAP = {
    PlayCircle, Square, bot: Bot, 'git-branch': GitBranch, code: Code,
    globe: Globe, 'table-2': Table2, sparkles: Sparkles,
};
export function AIPreviewPanel({ result, explanation, onApply, onDiscard, onRegenerate }) {
    const nodeCounts = result.nodes.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] ?? 0) + 1;
        return acc;
    }, {});
    return (_jsx("div", { className: "space-y-4 px-1", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-base font-semibold text-neutral-800", children: result.name }), explanation && (_jsx("p", { className: "mt-1 text-sm leading-relaxed text-neutral-500", children: explanation }))] }), _jsxs("div", { children: [_jsx("h5", { className: "mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400", children: "\u8282\u70B9\u7EDF\u8BA1" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: Object.entries(nodeCounts).map(([type, count]) => {
                                const meta = NODE_TYPE_META[type];
                                const colors = getNodeColor(type);
                                if (!meta)
                                    return null;
                                return (_jsxs("span", { className: `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.border} border`, children: [_jsx("span", { className: `h-1.5 w-1.5 rounded-full ${colors.dot}` }), count, "x ", meta.label] }, type));
                            }) })] }), _jsxs("div", { children: [_jsx("h5", { className: "mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400", children: "\u6D41\u7A0B\u9884\u89C8" }), _jsx("div", { className: "rounded-lg border border-neutral-100 bg-neutral-50 p-3", children: result.nodes.map((node, index) => {
                                const meta = NODE_TYPE_META[node.type];
                                const colors = getNodeColor(node.type);
                                const Icon = meta ? ICON_MAP[meta.icon] : Code;
                                const isLast = index === result.nodes.length - 1;
                                return (_jsxs("div", { children: [_jsxs("div", { className: `flex items-center gap-2 rounded-md border px-2.5 py-1.5 ${colors.border} ${colors.bg}`, children: [Icon && _jsx(Icon, { className: "h-3.5 w-3.5" }), _jsx("span", { className: "text-xs font-medium text-neutral-700", children: node.id }), _jsx("span", { className: "text-[10px] text-neutral-400", children: meta?.label ?? node.type })] }), !isLast && (_jsxs("div", { className: "flex flex-col items-center py-0.5", children: [_jsx("div", { className: "h-3 w-px bg-neutral-300" }), _jsx(ArrowRight, { className: "h-3 w-3 -rotate-90 text-neutral-300" }), _jsx("div", { className: "h-3 w-px bg-neutral-300" })] }))] }, node.id));
                            }) }), _jsxs("p", { className: "mt-1.5 text-xs text-neutral-400", children: ["\u5171 ", result.edges.length, " \u6761\u8FDE\u63A5"] })] }), _jsxs("div", { className: "flex items-center gap-2 border-t border-neutral-100 pt-4", children: [_jsxs(Button, { variant: "ghost", size: "sm", onClick: onDiscard, className: "text-neutral-500", children: [_jsx(X, { className: "mr-1 h-3 w-3" }), "\u653E\u5F03"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: onRegenerate, children: [_jsx(RefreshCw, { className: "mr-1 h-3 w-3" }), "\u91CD\u65B0\u751F\u6210"] }), _jsxs(Button, { size: "sm", onClick: onApply, className: "ml-auto bg-violet-600 hover:bg-violet-700", children: [_jsx(Wand2, { className: "mr-1 h-3 w-3" }), "\u5E94\u7528\u5230\u753B\u5E03"] })] })] }) }));
}
