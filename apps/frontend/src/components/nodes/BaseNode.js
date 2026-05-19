import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getNodeColor } from '@/lib/node-theme';
const statusStyles = {
    idle: 'border-neutral-300',
    pending: 'border-neutral-300',
    running: 'border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
    completed: 'border-blue-500',
    failed: 'border-red-500',
    skipped: 'border-neutral-400 opacity-60',
};
const statusDotStyles = {
    idle: 'bg-neutral-300',
    pending: 'bg-neutral-300',
    running: 'bg-green-500 animate-pulse',
    completed: 'bg-blue-500',
    failed: 'bg-red-500',
    skipped: 'bg-neutral-400',
};
const statusTextStyles = {
    idle: '',
    pending: 'text-neutral-400',
    running: 'text-green-600',
    completed: 'text-blue-600',
    failed: 'text-red-600',
    skipped: 'text-neutral-400',
};
const STATUS_LABELS = {
    pending: '等待中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    skipped: '已跳过',
};
const BaseNode = memo(function BaseNode({ icon: Icon, children, data, selected, type }) {
    const nodeData = data;
    const status = nodeData.status ?? 'idle';
    const colors = getNodeColor(String(type));
    return (_jsx(motion.div, { initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.2 }, children: _jsxs("div", { className: cn('min-w-[180px] overflow-hidden rounded-lg border-2 bg-white shadow-sm transition-all duration-300', statusStyles[status] ?? statusStyles.idle, selected && cn('ring-2 ring-offset-1', colors.ring)), children: [_jsx(Handle, { type: "target", position: Position.Left, className: "!w-3 !h-3 !bg-neutral-400" }), _jsxs("div", { className: "flex", children: [_jsx("div", { className: cn('w-1 self-stretch', colors.accent) }), _jsxs("div", { className: "flex-1 px-3 py-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: cn('h-2 w-2 rounded-full transition-colors duration-300', statusDotStyles[status] ?? statusDotStyles.idle) }), _jsx(Icon, { className: "h-4 w-4 text-neutral-600" }), _jsx("span", { className: "text-sm font-medium text-neutral-800", children: nodeData.label })] }), status !== 'idle' && (_jsx("div", { className: cn('mt-0.5 text-[10px] font-medium', statusTextStyles[status]), children: STATUS_LABELS[status] })), children && _jsx("div", { className: "mt-1.5 text-xs text-neutral-500", children: children })] })] }), _jsx(Handle, { type: "source", position: Position.Right, className: "!w-3 !h-3 !bg-neutral-400" })] }) }));
});
export { BaseNode };
