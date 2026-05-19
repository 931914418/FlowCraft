import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
const statusStyles = {
    idle: 'border-red-300',
    pending: 'border-red-300',
    running: 'border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
    completed: 'border-blue-500',
    failed: 'border-red-500',
    skipped: 'border-neutral-400 opacity-60',
};
const EndNode = memo(function EndNode(props) {
    const data = props.data;
    const status = data.status ?? 'idle';
    return (_jsx(motion.div, { initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.2 }, children: _jsxs("div", { className: cn('min-w-[140px] overflow-hidden rounded-lg border-2 bg-red-50 shadow-sm transition-all duration-300', statusStyles[status] ?? statusStyles.idle, props.selected && 'ring-2 ring-blue-400 ring-offset-1'), children: [_jsx(Handle, { type: "target", position: Position.Left, className: "!w-3 !h-3 !bg-red-400" }), _jsxs("div", { className: "flex", children: [_jsx("div", { className: "w-1 self-stretch rounded-l-lg bg-red-500" }), _jsx("div", { className: "flex-1 px-3 py-2", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Square, { className: "h-5 w-5 text-red-500" }), _jsx("span", { className: "text-sm font-semibold text-red-800", children: data.label })] }) })] })] }) }));
});
export default EndNode;
