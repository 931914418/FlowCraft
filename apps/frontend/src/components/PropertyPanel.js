import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { NODE_TYPE_META } from '@flowcraft/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getNodeColor } from '@/lib/node-theme';
import { LLMEditor } from '@/components/editors/LLMEditor';
import { ConditionEditor } from '@/components/editors/ConditionEditor';
import { HttpEditor } from '@/components/editors/HttpEditor';
import { CodeEditor } from '@/components/editors/CodeEditor';
import { DataMapperEditor } from '@/components/editors/DataMapperEditor';
import { AIProcessorEditor } from '@/components/editors/AIProcessorEditor';
function getNodeConfig(node) {
    return node.data?.config ?? {};
}
const EDITOR_MAP = {
    llm: LLMEditor,
    condition: ConditionEditor,
    http: HttpEditor,
    code: CodeEditor,
    'data-mapper': DataMapperEditor,
    'ai-processor': AIProcessorEditor,
};
export function PropertyPanel({ node, onUpdate, onChangeNodeType, onClose }) {
    const config = getNodeConfig(node);
    const nodeType = node.type;
    const label = node.data.label ?? '';
    const meta = NODE_TYPE_META[nodeType];
    const colors = getNodeColor(nodeType);
    const EditorComponent = EDITOR_MAP[nodeType];
    const [localLabel, setLocalLabel] = useState(label);
    const [localConfig, setLocalConfig] = useState({ ...config });
    const [dirty, setDirty] = useState(false);
    useEffect(() => {
        const newConfig = getNodeConfig(node);
        setLocalLabel(label);
        setLocalConfig({ ...newConfig });
        setDirty(false);
    }, [node.id]);
    const handleChange = useCallback((key, value) => {
        setLocalConfig((prev) => ({ ...prev, [key]: value }));
        setDirty(true);
    }, []);
    const handleLabelChange = useCallback((value) => {
        setLocalLabel(value);
        setDirty(true);
    }, []);
    const handleBlur = useCallback(() => {
        if (!dirty)
            return;
        onUpdate(node.id, { ...node.data, label: localLabel, config: localConfig });
        setDirty(false);
    }, [dirty, node.id, node.data, localLabel, localConfig, onUpdate]);
    return (_jsxs("div", { className: "flex h-full w-80 flex-col border-l border-slate-200 bg-white", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-200 px-4 py-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: cn('h-5 w-1 rounded-full', colors.accent) }), _jsx("h3", { className: "text-sm font-semibold text-slate-800", children: meta?.label ?? nodeType }), dirty && _jsx("span", { className: "text-xs text-amber-600", children: "(unsaved)" })] }), _jsx(Button, { variant: "ghost", size: "icon", onClick: onClose, children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx(ScrollArea, { className: "flex-1 p-4", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "rounded-lg bg-slate-50 p-3", children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium text-slate-400", children: "Label" }), _jsx(Input, { value: localLabel, onChange: (e) => handleLabelChange(e.target.value), onBlur: handleBlur })] }), EditorComponent ? (_jsx(EditorComponent, { config: localConfig, onChange: handleChange, onBlur: handleBlur })) : (_jsx("p", { className: "text-xs text-slate-400", children: "\u6B64\u8282\u70B9\u65E0\u53EF\u914D\u7F6E\u5C5E\u6027" })), nodeType === 'data-mapper' && (_jsx("div", { className: "mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-amber-800", children: "\u9700\u8981\u66F4\u7075\u6D3B\u7684\u5904\u7406\uFF1F" }), _jsx("p", { className: "text-xs text-amber-600", children: "\u5207\u6362\u4E3A\u4EE3\u7801\u6A21\u5F0F\uFF0C\u7528 JavaScript \u81EA\u5B9A\u4E49\u6570\u636E\u8F6C\u6362" })] }), _jsx(Button, { variant: "outline", size: "sm", className: "border-amber-300 text-amber-700 hover:bg-amber-100", onClick: () => onChangeNodeType?.(node.id, 'code'), children: "\u5207\u6362" })] }) }))] }) })] }));
}
