import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ConfigField } from './shared/ConfigField';
import { SectionHeader } from './shared/SectionHeader';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem } from '@/components/ui/select';
export function AIProcessorEditor({ config, onChange, onBlur }) {
    const outputFormat = config.outputFormat ?? 'auto';
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(SectionHeader, { title: "AI \u5904\u7406" }), _jsxs("div", { className: "rounded-lg bg-slate-50 p-3 space-y-3", children: [_jsx(ConfigField, { label: "\u5904\u7406\u6307\u4EE4", children: _jsx(Textarea, { rows: 5, value: config.instruction ?? '', onChange: (e) => onChange('instruction', e.target.value), onBlur: onBlur, placeholder: "\u7528\u81EA\u7136\u8BED\u8A00\u63CF\u8FF0\u4F60\u60F3\u8981\u7684\u6570\u636E\u5904\u7406\uFF0C\u4F8B\u5982\uFF1A\u4ECE\u6587\u672C\u4E2D\u63D0\u53D6\u6240\u6709\u90AE\u7BB1\u5730\u5740" }) }), _jsx(ConfigField, { label: "\u6A21\u578B", children: _jsxs(Select, { value: config.model ?? 'GLM-4.7', onValueChange: (v) => onChange('model', v), onBlur: onBlur, children: [_jsx(SelectItem, { value: "GLM-4.7", children: "GLM-4.7" }), _jsx(SelectItem, { value: "gpt-4o", children: "GPT-4o" }), _jsx(SelectItem, { value: "claude-sonnet-4-20250514", children: "Claude Sonnet 4" })] }) }), _jsx(ConfigField, { label: "\u8F93\u51FA\u683C\u5F0F", children: _jsxs(Select, { value: outputFormat, onValueChange: (v) => onChange('outputFormat', v), onBlur: onBlur, children: [_jsx(SelectItem, { value: "auto", children: "\u81EA\u52A8" }), _jsx(SelectItem, { value: "json", children: "JSON" }), _jsx(SelectItem, { value: "text", children: "\u7EAF\u6587\u672C" }), _jsx(SelectItem, { value: "list", children: "\u5217\u8868" })] }) }), outputFormat === 'json' && (_jsx(ConfigField, { label: "\u8F93\u51FA\u683C\u5F0F\u63CF\u8FF0", children: _jsx(Textarea, { rows: 3, value: config.outputSchema ?? '', onChange: (e) => onChange('outputSchema', e.target.value), onBlur: onBlur, placeholder: "\u63CF\u8FF0\u671F\u671B\u7684\u8F93\u51FA\u683C\u5F0F\uFF0C\u5982\uFF1A{ name: string, email: string }", className: "font-mono text-xs" }) }))] }), _jsx(SectionHeader, { title: "Prompt \u9884\u89C8" }), _jsx("div", { className: "rounded-lg bg-slate-50 p-3", children: _jsx("pre", { className: "max-h-40 overflow-auto whitespace-pre-wrap text-xs text-slate-600 font-mono", children: `你是一个数据处理助手。根据用户指令处理以下数据。

上游数据：
${config.instruction ? '(执行时自动填充)' : '(无上游数据)'}

处理指令：
${config.instruction || '(未设置)'}

${outputFormat === 'json' ? '请以 JSON 格式返回结果。' : ''}${config.outputSchema ? `输出格式要求：${config.outputSchema}` : ''}` }) })] }));
}
