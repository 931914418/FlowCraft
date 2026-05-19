import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NODE_TYPE_META } from '@flowcraft/shared';
import { PlayCircle, Square, Bot, GitBranch, Code, Globe, } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNodeColor } from '@/lib/node-theme';
const ICON_MAP = {
    'PlayCircle': PlayCircle,
    'Square': Square,
    'bot': Bot,
    'git-branch': GitBranch,
    'code': Code,
    'globe': Globe,
};
const nodeTypes = Object.keys(NODE_TYPE_META);
export function NodePalette({ onAddNode, aiMode = 'simple' }) {
    function handleDragStart(e, type) {
        e.dataTransfer.setData('application/reactflow', type);
        e.dataTransfer.effectAllowed = 'move';
    }
    function handleClick(type) {
        onAddNode?.(type);
    }
    return (_jsxs("div", { className: "flex flex-col gap-1 p-2", children: [_jsx("h3", { className: "mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-neutral-400", children: "Nodes" }), nodeTypes.map((type) => {
                const meta = NODE_TYPE_META[type];
                const Icon = ICON_MAP[meta.icon] ?? Code;
                const label = meta.label;
                const colors = getNodeColor(type);
                const isFiltered = aiMode === 'simple' && type === 'code';
                return (_jsxs("div", { title: meta.description, draggable: !isFiltered, onDragStart: (e) => handleDragStart(e, type), onClick: () => !isFiltered && handleClick(type), className: cn('group relative flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm text-neutral-700 transition-colors', isFiltered
                        ? 'cursor-not-allowed opacity-30'
                        : 'cursor-grab hover:border-neutral-200 active:cursor-grabbing', !isFiltered && `hover:${colors.bg}`, meta.color), children: [_jsx(Icon, { className: "h-4 w-4" }), _jsx("span", { children: label }), isFiltered && (_jsx("span", { className: "ml-auto text-[10px] text-neutral-400", children: "\u9AD8\u7EA7\u6A21\u5F0F" })), !isFiltered && (_jsxs("div", { className: "pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-800 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100", children: [meta.description, _jsx("div", { className: "absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-neutral-800" })] }))] }, type));
            })] }));
}
