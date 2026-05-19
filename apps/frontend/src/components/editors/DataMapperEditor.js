import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo, useCallback, useEffect } from 'react';
import { ConfigField } from './shared/ConfigField';
import { SectionHeader } from './shared/SectionHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ChevronDown, ChevronRight, ListPlus } from 'lucide-react';
/** 从嵌套对象中提取所有叶子字段的点分隔路径 */
function extractPaths(obj, prefix = '') {
    if (!obj || typeof obj !== 'object')
        return [];
    if (Array.isArray(obj)) {
        if (obj.length > 0)
            return extractPaths(obj[0], prefix ? `${prefix}.0` : '0');
        return [];
    }
    const paths = [];
    for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            paths.push(...extractPaths(value, path));
        }
        else {
            paths.push(path);
        }
    }
    return paths;
}
/** 将路径按 "." 分段，返回缩进深度和最后一段名称 */
function pathToSegments(path) {
    const parts = path.split('.');
    return { depth: parts.length - 1, label: parts[parts.length - 1] };
}
function getMappings(config) {
    const raw = config.mappings;
    if (Array.isArray(raw))
        return raw;
    return [];
}
function buildOutputPreview(mappings) {
    const active = mappings.filter((m) => m.enabled && m.sourcePath);
    if (!active.length)
        return '{}';
    const obj = {};
    active.forEach((m) => { obj[m.targetName || m.sourcePath] = '...'; });
    return JSON.stringify(obj, null, 2);
}
export function DataMapperEditor({ config, onChange, onBlur }) {
    const mappings = getMappings(config);
    const sourceNodeId = config.sourceNodeId ?? '';
    // 上游数据预览状态
    const [previewExpanded, setPreviewExpanded] = useState(false);
    const [sampleData, setSampleData] = useState('');
    const [parsedFields, setParsedFields] = useState([]);
    const [parseError, setParseError] = useState('');
    const updateMappings = useCallback((newMappings) => {
        onChange('mappings', newMappings);
        onBlur();
    }, [onChange, onBlur]);
    const preview = useMemo(() => buildOutputPreview(mappings), [mappings]);
    // 当示例数据变化时解析字段路径
    useEffect(() => {
        if (!sampleData.trim()) {
            setParsedFields([]);
            setParseError('');
            return;
        }
        try {
            const data = JSON.parse(sampleData);
            const fields = extractPaths(data);
            setParsedFields(fields);
            setParseError('');
        }
        catch {
            setParsedFields([]);
            setParseError('JSON 格式无效，请检查输入');
        }
    }, [sampleData]);
    /** 从解析出的字段列表中添加单条映射 */
    const handleAddField = useCallback((fieldPath) => {
        const alreadyExists = mappings.some((m) => m.sourcePath === fieldPath);
        if (alreadyExists)
            return;
        const { label } = pathToSegments(fieldPath);
        updateMappings([...mappings, { sourcePath: fieldPath, targetName: label, enabled: true }]);
    }, [mappings, updateMappings]);
    /** AI 推荐映射：将所有解析出的字段全部添加为映射 */
    const handleAiSuggest = useCallback(() => {
        if (!parsedFields.length)
            return;
        const newMappings = parsedFields.map((path) => {
            const { label } = pathToSegments(path);
            return { sourcePath: path, targetName: label, enabled: true };
        });
        updateMappings(newMappings);
    }, [parsedFields, updateMappings]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(SectionHeader, { title: "\u6570\u636E\u6620\u5C04" }), _jsx("div", { className: "rounded-lg bg-slate-50 p-3 space-y-3", children: _jsx(ConfigField, { label: "\u6765\u6E90\u8282\u70B9", children: _jsx(Input, { value: sourceNodeId, onChange: (e) => onChange('sourceNodeId', e.target.value), onBlur: onBlur, placeholder: "\u8F93\u5165\u4E0A\u6E38\u8282\u70B9 ID" }) }) }), _jsxs("div", { className: "rounded-lg border border-slate-200 bg-white", children: [_jsxs("button", { className: "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50", onClick: () => setPreviewExpanded(!previewExpanded), children: [previewExpanded ? (_jsx(ChevronDown, { className: "h-3 w-3 text-slate-400" })) : (_jsx(ChevronRight, { className: "h-3 w-3 text-slate-400" })), "\u4E0A\u6E38\u6570\u636E\u9884\u89C8", parsedFields.length > 0 && (_jsxs("span", { className: "ml-auto rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] text-cyan-600", children: [parsedFields.length, " \u4E2A\u5B57\u6BB5"] }))] }), previewExpanded && (_jsxs("div", { className: "border-t border-slate-100 px-3 py-2 space-y-2", children: [_jsx(Textarea, { rows: 3, value: sampleData, onChange: (e) => setSampleData(e.target.value), placeholder: '\u7C98\u8D34 JSON \u793A\u4F8B\u6570\u636E\uFF0C\u4F8B\u5982: {"name": "Alice", "age": 30}', className: "font-mono text-xs" }), parseError && (_jsx("p", { className: "text-xs text-red-500", children: parseError })), parsedFields.length > 0 && (_jsxs("div", { className: "space-y-0.5", children: [_jsx("p", { className: "text-xs font-medium text-slate-500", children: "\u53EF\u7528\u5B57\u6BB5:" }), _jsx("div", { className: "max-h-40 overflow-y-auto", children: parsedFields.map((fieldPath) => {
                                            const { depth, label } = pathToSegments(fieldPath);
                                            const alreadyMapped = mappings.some((m) => m.sourcePath === fieldPath);
                                            return (_jsxs("div", { className: "flex items-center gap-1 rounded px-1 py-0.5 hover:bg-slate-50", style: { paddingLeft: `${depth * 12 + 4}px` }, children: [_jsx("span", { className: "truncate font-mono text-xs text-slate-700", title: fieldPath, children: label }), _jsx("span", { className: "shrink-0 text-[10px] text-slate-400", children: fieldPath }), _jsx(Button, { variant: "ghost", size: "icon", className: "ml-auto h-5 w-5 shrink-0 text-slate-400 hover:text-cyan-600", disabled: alreadyMapped, title: alreadyMapped ? '已添加' : '添加映射', onClick: () => handleAddField(fieldPath), children: _jsx(Plus, { className: "h-3 w-3" }) })] }, fieldPath));
                                        }) })] })), _jsxs(Button, { variant: "outline", size: "sm", className: "w-full text-xs", disabled: parsedFields.length === 0, onClick: handleAiSuggest, children: [_jsx(ListPlus, { className: "mr-1 h-3 w-3" }), "\u5168\u90E8\u6620\u5C04"] })] }))] }), _jsx(SectionHeader, { title: "\u5B57\u6BB5\u6620\u5C04" }), _jsxs("div", { className: "rounded-lg bg-slate-50 p-3 space-y-2", children: [mappings.length === 0 && (_jsx("p", { className: "text-xs text-slate-400", children: "\u6682\u65E0\u6620\u5C04\u3002\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u6DFB\u52A0\uFF0C\u6216\u4F7F\u7528\u4E0A\u6E38\u6570\u636E\u9884\u89C8\u5FEB\u901F\u751F\u6210\u3002" })), mappings.map((m, i) => (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("input", { type: "checkbox", checked: m.enabled, onChange: (e) => {
                                    const updated = [...mappings];
                                    updated[i] = { ...updated[i], enabled: e.target.checked };
                                    updateMappings(updated);
                                }, className: "h-4 w-4 rounded border-slate-300 accent-cyan-500" }), _jsx(Input, { value: m.sourcePath, onChange: (e) => {
                                    const updated = [...mappings];
                                    updated[i] = { ...updated[i], sourcePath: e.target.value };
                                    updateMappings(updated);
                                }, placeholder: "\u6E90\u5B57\u6BB5\u8DEF\u5F84", className: "flex-1 text-xs" }), _jsx("span", { className: "text-xs text-slate-400", children: "\u2192" }), _jsx(Input, { value: m.targetName, onChange: (e) => {
                                    const updated = [...mappings];
                                    updated[i] = { ...updated[i], targetName: e.target.value };
                                    updateMappings(updated);
                                }, placeholder: "\u8F93\u51FA\u540D\u79F0", className: "flex-1 text-xs" }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 shrink-0 text-slate-400 hover:text-red-500", onClick: () => updateMappings(mappings.filter((_, idx) => idx !== i)), children: _jsx(Trash2, { className: "h-3 w-3" }) })] }, i))), _jsxs(Button, { variant: "ghost", size: "sm", className: "w-full text-xs text-slate-400", onClick: () => updateMappings([...mappings, { sourcePath: '', targetName: '', enabled: true }]), children: [_jsx(Plus, { className: "mr-1 h-3 w-3" }), " \u6DFB\u52A0\u6620\u5C04"] })] }), _jsx(SectionHeader, { title: "\u8F93\u51FA\u9884\u89C8" }), _jsx("div", { className: "rounded-lg bg-slate-50 p-3", children: _jsx("pre", { className: "whitespace-pre-wrap font-mono text-xs text-slate-600", children: preview }) })] }));
}
