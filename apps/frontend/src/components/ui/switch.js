import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
export function Switch({ checked = false, onCheckedChange, className, ...props }) {
    return (_jsx("button", { type: "button", role: "switch", "aria-checked": checked, className: cn('peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2', 'disabled:cursor-not-allowed disabled:opacity-50', checked ? 'bg-neutral-900' : 'bg-neutral-200', className), onClick: () => onCheckedChange?.(!checked), ...props, children: _jsx("span", { className: cn('pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform', checked ? 'translate-x-4' : 'translate-x-0') }) }));
}
