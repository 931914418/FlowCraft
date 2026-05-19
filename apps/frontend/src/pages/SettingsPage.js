import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Plus, Trash2, Loader2, Check, X, Settings as SettingsIcon, Save, AlertCircle, } from 'lucide-react';
import { listApiKeys, createApiKey, updateApiKey, deleteApiKey, testApiKey, getPreferences, updatePreferences, listModels, } from '@/api/settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
const PROVIDER_LABELS = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    zhipu: '智谱 AI (GLM)',
    custom: '自定义',
};
const PROVIDER_COLORS = {
    openai: 'bg-green-100 text-green-800 border-green-200',
    anthropic: 'bg-orange-100 text-orange-800 border-orange-200',
    zhipu: 'bg-blue-100 text-blue-800 border-blue-200',
    custom: 'bg-gray-100 text-gray-800 border-gray-200',
};
export default function SettingsPage() {
    const navigate = useNavigate();
    const [apiKeys, setApiKeys] = useState([]);
    const [models, setModels] = useState([]);
    const [preferences, setPreferences] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [testingId, setTestingId] = useState(null);
    const [testResults, setTestResults] = useState({});
    // New API Key form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newKey, setNewKey] = useState({
        provider: 'openai',
        name: '',
        apiKey: '',
        baseUrl: '',
    });
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [keysData, modelsData, prefsData] = await Promise.all([
                listApiKeys(),
                listModels(),
                getPreferences(),
            ]);
            setApiKeys(keysData);
            setModels(modelsData);
            setPreferences(prefsData);
        }
        catch (err) {
            setError(err.message || 'Failed to load settings');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        loadData();
    }, [loadData]);
    const handleAddKey = async () => {
        if (!newKey.name || !newKey.apiKey) {
            setError('请填写名称和 API Key');
            return;
        }
        try {
            await createApiKey({
                provider: newKey.provider,
                name: newKey.name,
                apiKey: newKey.apiKey,
                baseUrl: newKey.baseUrl || undefined,
            });
            setShowAddForm(false);
            setNewKey({ provider: 'openai', name: '', apiKey: '', baseUrl: '' });
            await loadData();
        }
        catch (err) {
            setError(err.message || 'Failed to add API key');
        }
    };
    const handleDeleteKey = async (id) => {
        if (!window.confirm('确定删除此 API Key？'))
            return;
        try {
            await deleteApiKey(id);
            await loadData();
        }
        catch (err) {
            setError(err.message || 'Failed to delete API key');
        }
    };
    const handleToggleEnabled = async (id, enabled) => {
        try {
            await updateApiKey(id, { isEnabled: enabled });
            await loadData();
        }
        catch (err) {
            setError(err.message || 'Failed to update API key');
        }
    };
    const handleTestKey = async (id) => {
        setTestingId(id);
        try {
            const result = await testApiKey(id);
            setTestResults(prev => ({ ...prev, [id]: result }));
        }
        catch (err) {
            setTestResults(prev => ({ ...prev, [id]: { success: false, message: err.message } }));
        }
        finally {
            setTestingId(null);
        }
    };
    const handleSavePreferences = async () => {
        if (!preferences)
            return;
        try {
            await updatePreferences(preferences);
            alert('设置已保存');
        }
        catch (err) {
            setError(err.message || 'Failed to save preferences');
        }
    };
    if (loading) {
        return (_jsxs("div", { className: "flex h-screen items-center justify-center", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin text-slate-400" }), _jsx("span", { className: "ml-3 text-slate-400", children: "Loading settings..." })] }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-slate-50", children: [_jsx("header", { className: "border-b border-slate-200 bg-white", children: _jsxs("div", { className: "mx-auto flex max-w-5xl items-center justify-between px-6 py-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(SettingsIcon, { className: "h-5 w-5 text-slate-600" }), _jsx("h1", { className: "text-xl font-bold tracking-tight text-slate-700", children: "\u8BBE\u7F6E" })] }), _jsx(Button, { variant: "ghost", onClick: () => navigate('/'), children: "\u8FD4\u56DE" })] }) }), _jsxs("div", { className: "mx-auto max-w-5xl px-6 py-6 space-y-6", children: [error && (_jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700", children: [_jsx(AlertCircle, { className: "h-4 w-4 shrink-0" }), error, _jsx("button", { className: "ml-auto text-red-700 hover:text-red-900", onClick: () => setError(null), children: _jsx(X, { className: "h-4 w-4" }) })] })), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(CardTitle, { children: "API Keys" }), _jsxs(Button, { size: "sm", onClick: () => setShowAddForm(!showAddForm), children: [_jsx(Plus, { className: "mr-1.5 h-4 w-4" }), "\u6DFB\u52A0"] })] }) }), _jsxs(CardContent, { children: [showAddForm && (_jsxs("div", { className: "mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "\u63D0\u4F9B\u5546" }), _jsxs(Select, { value: newKey.provider, onValueChange: (value) => setNewKey({ ...newKey, provider: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: Object.entries(PROVIDER_LABELS).map(([key, label]) => (_jsx(SelectItem, { value: key, children: label }, key))) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "\u540D\u79F0" }), _jsx(Input, { placeholder: "My OpenAI Key", value: newKey.name, onChange: (e) => setNewKey({ ...newKey, name: e.target.value }) })] }), _jsxs("div", { children: [_jsx(Label, { children: "API Key" }), _jsx(Input, { type: "password", placeholder: "sk-...", value: newKey.apiKey, onChange: (e) => setNewKey({ ...newKey, apiKey: e.target.value }) })] }), (newKey.provider === 'custom' || newKey.provider === 'zhipu') && (_jsxs("div", { children: [_jsx(Label, { children: "Base URL\uFF08\u53EF\u9009\uFF09" }), _jsx(Input, { placeholder: "https://api.example.com/v1", value: newKey.baseUrl, onChange: (e) => setNewKey({ ...newKey, baseUrl: e.target.value }) })] })), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", onClick: handleAddKey, children: "\u4FDD\u5B58" }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => setShowAddForm(false), children: "\u53D6\u6D88" })] })] })), apiKeys.length === 0 ? (_jsxs("div", { className: "py-8 text-center text-sm text-slate-400", children: [_jsx(Key, { className: "mx-auto mb-2 h-8 w-8" }), "\u6682\u65E0 API Key\uFF0C\u70B9\u51FB\u4E0A\u65B9\u6309\u94AE\u6DFB\u52A0"] })) : (_jsx("div", { className: "space-y-3", children: apiKeys.map((key) => {
                                            const testResult = testResults[key.id];
                                            const isTesting = testingId === key.id;
                                            return (_jsxs("div", { className: "flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium text-slate-700", children: key.name }), _jsx(Badge, { variant: "outline", className: PROVIDER_COLORS[key.provider] || 'bg-gray-100', children: PROVIDER_LABELS[key.provider] || key.provider }), !key.isEnabled && (_jsx(Badge, { variant: "secondary", className: "text-xs", children: "\u5DF2\u7981\u7528" }))] }), _jsx("div", { className: "mt-1 text-xs text-slate-500 font-mono", children: key.apiKey })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Switch, { checked: key.isEnabled, onCheckedChange: (checked) => handleToggleEnabled(key.id, checked) }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => handleTestKey(key.id), disabled: isTesting || !key.isEnabled, children: isTesting ? (_jsx(Loader2, { className: "h-3 w-3 animate-spin" })) : testResult ? (testResult.success ? (_jsx(Check, { className: "h-3 w-3 text-green-600" })) : (_jsx(X, { className: "h-3 w-3 text-red-600" }))) : ('测试') }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleDeleteKey(key.id), children: _jsx(Trash2, { className: "h-4 w-4 text-red-600" }) })] })] }, key.id));
                                        }) }))] })] }), preferences && (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(CardTitle, { children: "\u9ED8\u8BA4\u6A21\u578B\u8BBE\u7F6E" }), _jsxs(Button, { size: "sm", onClick: handleSavePreferences, children: [_jsx(Save, { className: "mr-1.5 h-4 w-4" }), "\u4FDD\u5B58"] })] }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "LLM \u8282\u70B9\u9ED8\u8BA4\u6A21\u578B" }), _jsxs(Select, { value: preferences.defaultLlmModel || '', onValueChange: (value) => setPreferences({ ...preferences, defaultLlmModel: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "\u9009\u62E9\u9ED8\u8BA4\u6A21\u578B" }) }), _jsx(SelectContent, { children: models.map((model) => (_jsx(SelectItem, { value: model.modelId, children: model.displayName }, model.id))) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "AI \u5904\u7406\u5668\u9ED8\u8BA4\u6A21\u578B" }), _jsxs(Select, { value: preferences.defaultAiProcessorModel || '', onValueChange: (value) => setPreferences({ ...preferences, defaultAiProcessorModel: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "\u9009\u62E9\u9ED8\u8BA4\u6A21\u578B" }) }), _jsx(SelectContent, { children: models.map((model) => (_jsx(SelectItem, { value: model.modelId, children: model.displayName }, model.id))) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "\u5DE5\u4F5C\u6D41\u751F\u6210\u9ED8\u8BA4\u6A21\u578B" }), _jsxs(Select, { value: preferences.defaultWorkflowGenModel || '', onValueChange: (value) => setPreferences({ ...preferences, defaultWorkflowGenModel: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "\u9009\u62E9\u9ED8\u8BA4\u6A21\u578B" }) }), _jsx(SelectContent, { children: models.map((model) => (_jsx(SelectItem, { value: model.modelId, children: model.displayName }, model.id))) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "\u8BF7\u6C42\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09" }), _jsx(Input, { type: "number", value: preferences.requestTimeout || 30000, onChange: (e) => setPreferences({
                                                                ...preferences,
                                                                requestTimeout: parseInt(e.target.value) || 30000,
                                                            }) })] }), _jsxs("div", { children: [_jsx(Label, { children: "\u6700\u5927\u91CD\u8BD5\u6B21\u6570" }), _jsx(Input, { type: "number", value: preferences.maxRetries || 2, onChange: (e) => setPreferences({
                                                                ...preferences,
                                                                maxRetries: parseInt(e.target.value) || 2,
                                                            }) })] })] })] }) })] })), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "\u53EF\u7528\u6A21\u578B" }) }), _jsx(CardContent, { children: _jsx("div", { className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3", children: models.map((model) => (_jsxs("div", { className: "rounded-lg border border-slate-200 bg-white p-3 text-sm", children: [_jsx("div", { className: "font-medium text-slate-700", children: model.displayName }), _jsx("div", { className: "mt-1 text-xs text-slate-500", children: model.modelId }), _jsx(Badge, { variant: "outline", className: "mt-2 text-xs", children: PROVIDER_LABELS[model.provider] || model.provider })] }, model.id))) }) })] })] })] }));
}
