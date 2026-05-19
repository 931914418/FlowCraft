import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
const statusStyles = {
    idle: 'border-green-400',
    pending: 'border-green-400',
    running: 'border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
    completed: 'border-blue-500',
    failed: 'border-red-500',
    skipped: 'border-neutral-400 opacity-60',
};
const StartNode = memo(function StartNode(props) {
    const data = props.data;
    const status = data.status ?? 'idle';
    return (_jsx(motion.div, { initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.2 }, children: _jsxs("div", { className: cn('min-w-[140px] overflow-hidden rounded-lg border-2 bg-green-50 shadow-sm transition-all duration-300', statusStyles[status] ?? statusStyles.idle, props.selected && 'ring-2 ring-blue-400 ring-offset-1'), children: [_jsxs("div", { className: "flex", children: [_jsx("div", { className: "w-1 self-stretch rounded-l-lg bg-green-500" }), _jsx("div", { className: "flex-1 px-3 py-2", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(PlayCircle, { className: "h-5 w-5 text-green-600" }), _jsx("span", { className: "text-sm font-semibold text-green-800", children: data.label })] }) })] }), _jsx(Handle, { type: "source", position: Position.Right, className: "!w-3 !h-3 !bg-green-500" })] }) }));
});
export default StartNode;
