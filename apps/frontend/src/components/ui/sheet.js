import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
export function Sheet({ open, onClose, side = 'right', title, children }) {
    const slideFrom = side === 'right' ? { x: '100%' } : { x: '-100%' };
    return (_jsx(AnimatePresence, { children: open && (_jsxs(_Fragment, { children: [_jsx(motion.div, { className: "fixed inset-0 z-40 bg-black/20", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: onClose }), _jsxs(motion.div, { className: cn('fixed top-0 z-50 flex h-full w-96 flex-col bg-white shadow-xl', side === 'right' ? 'right-0' : 'left-0'), initial: slideFrom, animate: { x: 0 }, exit: slideFrom, transition: { type: 'spring', damping: 30, stiffness: 300 }, children: [_jsxs("div", { className: "flex items-center justify-between border-b px-4 py-3", children: [_jsx("h3", { className: "text-sm font-semibold text-neutral-800", children: title }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7", onClick: onClose, children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx("div", { className: "flex-1 overflow-auto p-4", children: children })] })] })) }));
}
