import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { SectionHeader } from './shared/SectionHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Plus, Trash2 } from 'lucide-react';
import { API_BASE } from '@/lib/api-config';
function parseHeaders(raw) {
    if (Array.isArray(raw))
        return raw;
    if (typeof raw === 'string' && raw) {
        try {
            const obj = JSON.parse(raw);
            return Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }));
        }
        catch { /* ignore */ }
    }
    return [{ key: '', value: '' }];
}
export function HttpEditor({ config, onChange, onBlur }) {
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const headers = parseHeaders(config.headers);
    const method = config.method ?? 'GET';
    const updateHeaders = useCallback((newHeaders) => {
        onChange('headers', newHeaders);
        onBlur();
    }, [onChange, onBlur]);
    const handleTest = useCallback(async () => {
        const url = config.url ?? '';
        if (!url)
            return;
        setTesting(true);
        setTestResult(null);
        try {
            const headerObj = {};
            headers.forEach((h) => { if (h.key)
                headerObj[h.key] = h.value; });
            const res = await fetch(`${API_BASE}/test/node`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nodeType: 'http',
                    config: { url, method, headers: headerObj, body: config.body },
                }),
            });
            const data = await res.json();
            setTestResult({
                status: data.success ? 200 : 500,
                time: data.durationMs || 0,
                body: data.success
                    ? (typeof data.output === 'string' ? data.output.slice(0, 500) : JSON.stringify(data.output, null, 2).slice(0, 500))
                    : (data.error || 'Unknown error'),
            });
        }
        catch (err) {
            setTestResult({ status: 0, time: 0, body: err instanceof Error ? err.message : 'Request failed' });
        }
        finally {
            setTesting(false);
        }
    }, [config.url, config.body, method, headers]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(SectionHeader, { title: "\u8BF7\u6C42\u914D\u7F6E" }), _jsx("div", { className: "rounded-lg bg-slate-50 p-3", children: _jsxs("div", { className: "flex gap-2", children: [_jsx("div", { className: "w-24 shrink-0", children: _jsxs(Select, { value: method, onValueChange: (v) => onChange('method', v), onBlur: onBlur, children: [_jsx(SelectItem, { value: "GET", children: "GET" }), _jsx(SelectItem, { value: "POST", children: "POST" }), _jsx(SelectItem, { value: "PUT", children: "PUT" }), _jsx(SelectItem, { value: "DELETE", children: "DELETE" }), _jsx(SelectItem, { value: "PATCH", children: "PATCH" })] }) }), _jsx(Input, { value: config.url ?? '', onChange: (e) => onChange('url', e.target.value), onBlur: onBlur, placeholder: "https://api.example.com/data", className: "flex-1" })] }) }), _jsx(SectionHeader, { title: "Headers" }), _jsxs("div", { className: "rounded-lg bg-slate-50 p-3 space-y-2", children: [headers.map((h, i) => (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(Input, { value: h.key, onChange: (e) => {
                                    const updated = [...headers];
                                    updated[i] = { ...updated[i], key: e.target.value };
                                    updateHeaders(updated);
                                }, placeholder: "Key", className: "flex-1 text-xs" }), _jsx(Input, { value: h.value, onChange: (e) => {
                                    const updated = [...headers];
                                    updated[i] = { ...updated[i], value: e.target.value };
                                    updateHeaders(updated);
                                }, placeholder: "Value", className: "flex-1 text-xs" }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 shrink-0 text-slate-400 hover:text-red-500", onClick: () => {
                                    const updated = headers.filter((_, idx) => idx !== i);
                                    updateHeaders(updated.length ? updated : [{ key: '', value: '' }]);
                                }, children: _jsx(Trash2, { className: "h-3 w-3" }) })] }, i))), _jsxs(Button, { variant: "ghost", size: "sm", className: "w-full text-xs text-slate-400", onClick: () => updateHeaders([...headers, { key: '', value: '' }]), children: [_jsx(Plus, { className: "mr-1 h-3 w-3" }), " \u6DFB\u52A0 Header"] })] }), ['POST', 'PUT', 'PATCH'].includes(method) && (_jsxs(_Fragment, { children: [_jsx(SectionHeader, { title: "Body" }), _jsx("div", { className: "rounded-lg bg-slate-50 p-3", children: _jsx(Textarea, { rows: 4, value: config.body ?? '', onChange: (e) => onChange('body', e.target.value), onBlur: onBlur, placeholder: "Request body (JSON)", className: "font-mono text-xs" }) })] })), _jsx(SectionHeader, { title: "\u6D4B\u8BD5" }), _jsxs("div", { className: "rounded-lg bg-slate-50 p-3 space-y-2", children: [_jsxs(Button, { variant: "outline", size: "sm", className: "w-full", onClick: handleTest, disabled: testing || !config.url, children: [testing ? _jsx(Loader2, { className: "mr-1 h-3 w-3 animate-spin" }) : _jsx(Send, { className: "mr-1 h-3 w-3" }), "\u53D1\u9001\u6D4B\u8BD5"] }), testResult && (_jsxs("div", { className: "rounded-md border border-slate-200 bg-white p-2 text-xs", children: [_jsxs("div", { className: "mb-1 flex items-center gap-2", children: [_jsx("span", { className: testResult.status >= 200 && testResult.status < 300 ? 'text-green-600' : 'text-red-600', children: testResult.status || 'Error' }), testResult.time > 0 && _jsxs("span", { className: "text-slate-400", children: [testResult.time, "ms"] })] }), _jsx("pre", { className: "max-h-32 overflow-auto whitespace-pre-wrap font-mono text-slate-600", children: testResult.body })] }))] })] }));
}
