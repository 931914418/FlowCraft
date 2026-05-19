import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
function Select({ value, onValueChange, placeholder, children, className, onBlur, ...props }) {
    return (_jsxs("select", { value: value, onChange: (e) => {
            onValueChange?.(e.target.value);
            // Trigger blur handler on change so config saves immediately
            if (onBlur) {
                onBlur({ target: e.target, type: 'change' });
            }
        }, className: cn('flex h-9 w-full rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-50', className), onBlur: onBlur, ...props, children: [placeholder && (_jsx("option", { value: "", disabled: true, children: placeholder })), children] }));
}
function SelectItem({ value, children, ...props }) {
    return (_jsx("option", { value: value, ...props, children: children }));
}
export { Select, SelectItem };
