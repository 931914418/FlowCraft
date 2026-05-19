import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ConfigField } from './shared/ConfigField';
import { SectionHeader } from './shared/SectionHeader';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem } from '@/components/ui/select';
const QUICK_TEMPLATES = {
    translate: { systemPrompt: '你是专业翻译。', prompt: '将以下文本翻译为{{target_language}}：\n{{input}}' },
    summarize: { systemPrompt: '你是摘要专家。', prompt: '请对以下内容进行摘要：\n{{input}}' },
    classify: { systemPrompt: '你是分类专家。', prompt: '对以下文本进行分类：\n{{input}}' },
};
export function LLMEditor({ config, onChange, onBlur }) {
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(SectionHeader, { title: "\u5FEB\u6377\u6A21\u677F" }), _jsx("div", { className: "rounded-lg bg-slate-50 p-3", children: _jsxs(Select, { value: "__placeholder__", onValueChange: (v) => {
                        if (v && v !== '__placeholder__' && QUICK_TEMPLATES[v]) {
                            const tpl = QUICK_TEMPLATES[v];
                            onChange('systemPrompt', tpl.systemPrompt);
                            onChange('prompt', tpl.prompt);
                            onBlur();
                        }
                    }, onBlur: onBlur, children: [_jsx(SelectItem, { value: "__placeholder__", children: "\u9009\u62E9\u6A21\u677F\uFF08\u53EF\u9009\uFF09" }), Object.keys(QUICK_TEMPLATES).map((key) => (_jsx(SelectItem, { value: key, children: QUICK_TEMPLATES[key].systemPrompt.replace('你是', '').replace('。', '') }, key)))] }) }), _jsx(SectionHeader, { title: "\u6A21\u578B\u914D\u7F6E" }), _jsxs("div", { className: "rounded-lg bg-slate-50 p-3 space-y-3", children: [_jsx(ConfigField, { label: "Model", children: _jsxs(Select, { value: config.model ?? '', onValueChange: (v) => onChange('model', v), onBlur: onBlur, children: [_jsx(SelectItem, { value: "GLM-4.7", children: "GLM-4.7" }), _jsx(SelectItem, { value: "gpt-4o", children: "GPT-4o" }), _jsx(SelectItem, { value: "gpt-4o-mini", children: "GPT-4o Mini" }), _jsx(SelectItem, { value: "claude-sonnet-4-20250514", children: "Claude Sonnet 4" }), _jsx(SelectItem, { value: "claude-haiku-4-20250514", children: "Claude Haiku 4" })] }) }), _jsx(ConfigField, { label: "System Prompt", children: _jsx(Textarea, { rows: 3, value: config.systemPrompt ?? '', onChange: (e) => onChange('systemPrompt', e.target.value), onBlur: onBlur, placeholder: "You are a helpful assistant..." }) }), _jsx(ConfigField, { label: "Prompt", children: _jsx(Textarea, { rows: 4, value: config.prompt ?? '', onChange: (e) => onChange('prompt', e.target.value), onBlur: onBlur, placeholder: "Enter your prompt template..." }) }), _jsx(ConfigField, { label: `Temperature: ${config.temperature ?? 0.7}`, children: _jsx("input", { type: "range", min: 0, max: 2, step: 0.1, value: config.temperature ?? 0.7, onChange: (e) => onChange('temperature', parseFloat(e.target.value)), onMouseUp: onBlur, onTouchEnd: onBlur, className: "w-full accent-violet-500" }) })] })] }));
}
