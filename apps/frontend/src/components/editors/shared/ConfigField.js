import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ConfigField({ label, children, hint }) {
    return (_jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "block text-xs font-medium text-slate-400", children: label }), children, hint && _jsx("p", { className: "text-xs text-slate-400", children: hint })] }));
}
