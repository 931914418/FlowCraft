import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ConfigField } from './shared/ConfigField';
import { SectionHeader } from './shared/SectionHeader';
import { FieldInput } from './shared/FieldInput';
import { Input } from '@/components/ui/input';
import { Select, SelectItem } from '@/components/ui/select';
const OPERATORS = [
    { value: 'eq', label: '等于' },
    { value: 'neq', label: '不等于' },
    { value: 'gt', label: '大于' },
    { value: 'lt', label: '小于' },
    { value: 'gte', label: '大于等于' },
    { value: 'lte', label: '小于等于' },
    { value: 'contains', label: '包含' },
    { value: 'not_contains', label: '不包含' },
    { value: 'empty', label: '为空' },
    { value: 'not_empty', label: '不为空' },
];
const NO_VALUE_OPS = ['empty', 'not_empty'];
/** 从 field 配置中提取显示用的字段路径字符串 */
function resolveFieldPath(field) {
    if (typeof field === 'string')
        return field;
    if (field && typeof field === 'object' && 'path' in field) {
        return field.path;
    }
    return '';
}
function buildExpression(config) {
    const fieldPath = resolveFieldPath(config.field);
    const op = config.operator ?? 'eq';
    const value = config.value ?? '';
    if (!fieldPath)
        return '';
    if (NO_VALUE_OPS.includes(op)) {
        return op === 'empty' ? `!${fieldPath}` : `${fieldPath}`;
    }
    const opMap = {
        eq: '==', neq: '!=', gt: '>', lt: '<', gte: '>=', lte: '<=',
        contains: 'includes', not_contains: '!includes',
    };
    const symbol = opMap[op] ?? '==';
    if (op === 'contains' || op === 'not_contains') {
        return `${symbol}(${fieldPath}, "${value}")`;
    }
    return `${fieldPath} ${symbol} ${value}`;
}
/** 根据 sourceNodeId 和字段路径构造 field 值 */
function buildFieldValue(sourceNodeId, path) {
    if (sourceNodeId)
        return { sourceNodeId, path };
    return path;
}
export function ConditionEditor({ config, onChange, onBlur }) {
    const operator = config.operator ?? 'eq';
    const needsValue = !NO_VALUE_OPS.includes(operator);
    const expression = buildExpression(config);
    const sourceNodeId = config.sourceNodeId ?? '';
    const fieldPath = resolveFieldPath(config.field);
    const value = config.value ?? '';
    const handleFieldChange = (path) => {
        onChange('field', buildFieldValue(sourceNodeId, path));
    };
    const handleSourceNodeChange = (newSourceNodeId) => {
        onChange('sourceNodeId', newSourceNodeId);
        onChange('field', buildFieldValue(newSourceNodeId, fieldPath));
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(SectionHeader, { title: "\u6761\u4EF6\u8BBE\u7F6E" }), _jsxs("div", { className: "rounded-lg bg-slate-50 p-3 space-y-3", children: [_jsx(ConfigField, { label: "\u6765\u6E90\u8282\u70B9\uFF08\u53EF\u9009\uFF09", children: _jsx(Input, { value: sourceNodeId, onChange: (e) => handleSourceNodeChange(e.target.value), onBlur: onBlur, placeholder: "\u7559\u7A7A\u5219\u4F7F\u7528\u5DE5\u4F5C\u6D41\u8F93\u5165" }) }), _jsx(ConfigField, { label: "\u5B57\u6BB5", children: _jsx(FieldInput, { value: fieldPath, onChange: (v) => handleFieldChange(v), onBlur: onBlur, placeholder: "\u8F93\u5165\u5B57\u6BB5\u8DEF\u5F84\uFF0C\u5982 score" }) }), _jsx(ConfigField, { label: "\u6BD4\u8F83\u65B9\u5F0F", children: _jsx(Select, { value: operator, onValueChange: (v) => {
                                onChange('operator', v);
                                const newConfig = { ...config, operator: v };
                                onChange('expression', buildExpression(newConfig));
                                onBlur();
                            }, onBlur: onBlur, children: OPERATORS.map((op) => (_jsx(SelectItem, { value: op.value, children: op.label }, op.value))) }) }), needsValue && (_jsx(ConfigField, { label: "\u503C", children: _jsx(Input, { value: value, onChange: (e) => {
                                onChange('value', e.target.value);
                                const newConfig = { ...config, value: e.target.value };
                                onChange('expression', buildExpression(newConfig));
                            }, onBlur: onBlur, placeholder: "\u8F93\u5165\u6BD4\u8F83\u503C" }) }))] }), _jsx(SectionHeader, { title: "\u8F93\u51FA\u9884\u89C8" }), _jsx("div", { className: "rounded-lg bg-slate-50 p-3", children: _jsx("code", { className: "text-xs font-mono text-slate-600", children: expression || '(请填写字段)' }) })] }));
}
