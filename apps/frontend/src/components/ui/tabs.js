import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
export function Tabs({ value, onValueChange, children, className }) {
    return (_jsx("div", { className: cn('w-full', className), children: children }));
}
export function TabsList({ children, className }) {
    return (_jsx("div", { className: cn('inline-flex h-9 items-center justify-center rounded-lg bg-neutral-100 p-1', className), children: children }));
}
export function TabsTrigger({ value, children, className, onClick }) {
    // 这个组件需要从父组件获取上下文，但为了简化，我们直接使用 prop
    // 实际使用时需要通过 context 或者比较 value
    return (_jsx("button", { onClick: onClick, className: cn('inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:pointer-events-none disabled:opacity-50', 'data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm', className), "data-state": onClick ? 'active' : 'inactive', children: children }));
}
export function TabsContent({ value, children, className }) {
    return (_jsx("div", { className: cn('mt-2', className), children: children }));
}
