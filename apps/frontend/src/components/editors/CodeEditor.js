import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SectionHeader } from './shared/SectionHeader';
import { Textarea } from '@/components/ui/textarea';
export function CodeEditor({ config, onChange, onBlur }) {
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(SectionHeader, { title: "\u4EE3\u7801\u7F16\u8F91" }), _jsxs("div", { className: "rounded-lg bg-slate-50 p-3", children: [_jsxs("p", { className: "mb-2 text-xs text-slate-400", children: [_jsx("span", { className: "font-medium text-slate-500", children: "\u8F93\u5165:" }), " \u4E0A\u6E38\u8282\u70B9\u8F93\u51FA \u00A0", _jsx("span", { className: "font-medium text-slate-500", children: "\u8F93\u51FA:" }), " return \u7ED3\u679C"] }), _jsx(Textarea, { rows: 12, value: config.code ?? '', onChange: (e) => onChange('code', e.target.value), onBlur: onBlur, placeholder: "// Write your JavaScript code here", className: "font-mono text-xs" })] })] }));
}
