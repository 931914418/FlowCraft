import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
const ConditionNode = memo(function ConditionNode(props) {
    const data = props.data;
    const selected = props.selected;
    return (_jsx(motion.div, { initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.2 }, children: _jsxs("div", { className: cn('relative min-w-[180px] overflow-hidden rounded-lg border-2 border-amber-400 bg-amber-50 shadow-sm transition-all duration-300', selected && 'ring-2 ring-blue-400 ring-offset-1'), children: [_jsx(Handle, { type: "target", position: Position.Left, className: "!w-3 !h-3 !bg-amber-500" }), _jsxs("div", { className: "flex", children: [_jsx("div", { className: "w-1 self-stretch rounded-l-lg bg-amber-500" }), _jsxs("div", { className: "flex-1 px-3 py-2", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(GitBranch, { className: "h-4 w-4 text-amber-600" }), _jsx("span", { className: "text-sm font-medium text-amber-900", children: data.label })] }), data.expression && (_jsx("div", { className: "text-xs text-amber-700 truncate max-w-[160px] mb-2", children: data.expression })), _jsx("div", { className: "flex items-center justify-between mt-1", children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Handle, { type: "source", position: Position.Right, id: "true", style: { top: 'calc(50% - 12px)' }, className: "!w-3 !h-3 !bg-green-500" }), _jsx("span", { className: "text-xs font-medium text-green-700 absolute -right-1 translate-x-full", children: "True" })] }) }), _jsxs("div", { className: "flex items-center gap-1 mt-3", children: [_jsx(Handle, { type: "source", position: Position.Right, id: "false", style: { top: 'calc(50% + 12px)' }, className: "!w-3 !h-3 !bg-red-400" }), _jsx("span", { className: "text-xs font-medium text-red-600 absolute -right-1 translate-x-full bottom-2", children: "False" })] })] })] })] }) }));
});
export default ConditionNode;
