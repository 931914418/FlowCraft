import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, TestTube } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';
const PROVIDERS = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'google', label: 'Google' },
    { value: 'custom', label: '自定义' },
];
const PRESET_MODELS = [
    { id: 'gpt-4', name: 'GPT-4', provider: 'openai', modelId: 'gpt-4', enabled: true },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', modelId: 'gpt-4-turbo-preview', enabled: true },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', modelId: 'gpt-3.5-turbo', enabled: true },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', modelId: 'claude-3-opus-20240229', enabled: true },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic', modelId: 'claude-3-sonnet-20240229', enabled: true },
    { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', modelId: 'claude-3-haiku-20240307', enabled: true },
];
export function SettingsSidebar({ open, onClose }) {
    const [activeTab, setActiveTab] = useState('api-keys');
    // API Keys 状态
    const [apiKeys, setApiKeys] = useState([]);
    const [editingKeyId, setEditingKeyId] = useState(null);
    const [newKeyForm, setNewKeyForm] = useState({ provider: 'openai', key: '', label: '' });
    const [showNewKeyForm, setShowNewKeyForm] = useState(false);
    // Models 状态
    const [customModels, setCustomModels] = useState([]);
    const [newModelForm, setNewModelForm] = useState({ name: '', provider: 'openai', modelId: '' });
    const [showNewModelForm, setShowNewModelForm] = useState(false);
    // Preferences 状态
    const [preferences, setPreferences] = useState({
        defaultModel: 'gpt-4',
        timeout: 30000,
        maxRetries: 3,
    });
    // 测试连接状态
    const [testingKeyId, setTestingKeyId] = useState(null);
    const [testResult, setTestResult] = useState(null);
    // 从 localStorage 加载配置
    useEffect(() => {
        loadSettings();
    }, []);
    const loadSettings = () => {
        try {
            const storedKeys = localStorage.getItem('flowcraft_api_keys');
            if (storedKeys) {
                setApiKeys(JSON.parse(storedKeys));
            }
            const storedModels = localStorage.getItem('flowcraft_custom_models');
            if (storedModels) {
                setCustomModels(JSON.parse(storedModels));
            }
            const storedPrefs = localStorage.getItem('flowcraft_preferences');
            if (storedPrefs) {
                setPreferences(JSON.parse(storedPrefs));
            }
        }
        catch (error) {
            console.error('加载设置失败:', error);
        }
    };
    const saveSettings = () => {
        try {
            localStorage.setItem('flowcraft_api_keys', JSON.stringify(apiKeys));
            localStorage.setItem('flowcraft_custom_models', JSON.stringify(customModels));
            localStorage.setItem('flowcraft_preferences', JSON.stringify(preferences));
        }
        catch (error) {
            console.error('保存设置失败:', error);
        }
    };
    // 脱敏 API Key
    const maskApiKey = (key) => {
        if (key.length <= 8)
            return '*'.repeat(key.length);
        return key.slice(0, 4) + '*'.repeat(key.length - 8) + key.slice(-4);
    };
    // API Keys 操作
    const handleAddKey = () => {
        if (!newKeyForm.key.trim())
            return;
        const newKey = {
            id: `key-${Date.now()}`,
            provider: newKeyForm.provider,
            key: newKeyForm.key,
            maskedKey: maskApiKey(newKeyForm.key),
            label: newKeyForm.label || newKeyForm.provider,
        };
        setApiKeys([...apiKeys, newKey]);
        setNewKeyForm({ provider: 'openai', key: '', label: '' });
        setShowNewKeyForm(false);
        saveSettings();
    };
    const handleDeleteKey = (keyId) => {
        setApiKeys(apiKeys.filter(k => k.id !== keyId));
        saveSettings();
    };
    const handleEditKey = (keyId) => {
        setEditingKeyId(keyId);
    };
    const handleSaveEdit = (keyId, newLabel) => {
        setApiKeys(apiKeys.map(k => k.id === keyId ? { ...k, label: newLabel } : k));
        setEditingKeyId(null);
        saveSettings();
    };
    const handleTestConnection = async (keyId) => {
        setTestingKeyId(keyId);
        setTestResult(null);
        // 模拟测试连接
        setTimeout(() => {
            const key = apiKeys.find(k => k.id === keyId);
            const success = key?.key.startsWith('sk-') || Math.random() > 0.3;
            setTestResult({
                keyId,
                success,
                message: success ? '连接成功！API Key 有效' : '连接失败，请检查 API Key',
            });
            setTestingKeyId(null);
        }, 1000);
    };
    // Models 操作
    const handleAddModel = () => {
        if (!newModelForm.name.trim() || !newModelForm.modelId.trim())
            return;
        const newModel = {
            id: `custom-${Date.now()}`,
            name: newModelForm.name,
            provider: newModelForm.provider,
            modelId: newModelForm.modelId,
            enabled: true,
        };
        setCustomModels([...customModels, newModel]);
        setNewModelForm({ name: '', provider: 'openai', modelId: '' });
        setShowNewModelForm(false);
        saveSettings();
    };
    const handleDeleteModel = (modelId) => {
        setCustomModels(customModels.filter(m => m.id !== modelId));
        saveSettings();
    };
    // 获取所有可用模型选项
    const allModels = [...PRESET_MODELS, ...customModels];
    return (_jsx(Sheet, { open: open, onClose: onClose, side: "right", title: "\u8BBE\u7F6E", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex gap-1 rounded-lg bg-neutral-100 p-1", children: [_jsx("button", { onClick: () => setActiveTab('api-keys'), className: cn('flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', activeTab === 'api-keys'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-600 hover:text-neutral-900'), children: "API Keys" }), _jsx("button", { onClick: () => setActiveTab('models'), className: cn('flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', activeTab === 'models'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-600 hover:text-neutral-900'), children: "Models" }), _jsx("button", { onClick: () => setActiveTab('preferences'), className: cn('flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', activeTab === 'preferences'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-600 hover:text-neutral-900'), children: "Preferences" })] }), activeTab === 'api-keys' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h4", { className: "text-sm font-medium text-neutral-700", children: "API \u5BC6\u94A5\u7BA1\u7406" }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => setShowNewKeyForm(!showNewKeyForm), className: "h-7 text-xs", children: [_jsx(Plus, { className: "mr-1 h-3 w-3" }), "\u6DFB\u52A0"] })] }), showNewKeyForm && (_jsxs("div", { className: "space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs text-neutral-600", children: "\u670D\u52A1\u5546" }), _jsx(Select, { value: newKeyForm.provider, onValueChange: (value) => setNewKeyForm({ ...newKeyForm, provider: value }), children: PROVIDERS.map((provider) => (_jsx(SelectItem, { value: provider.value, children: provider.label }, provider.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs text-neutral-600", children: "\u6807\u7B7E\uFF08\u53EF\u9009\uFF09" }), _jsx(Input, { value: newKeyForm.label, onChange: (e) => setNewKeyForm({ ...newKeyForm, label: e.target.value }), placeholder: "\u4F8B\u5982\uFF1A\u751F\u4EA7\u73AF\u5883", className: "h-8 text-xs" })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs text-neutral-600", children: "API Key" }), _jsx(Input, { type: "password", value: newKeyForm.key, onChange: (e) => setNewKeyForm({ ...newKeyForm, key: e.target.value }), placeholder: "sk-...", className: "h-8 text-xs" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", onClick: handleAddKey, className: "h-7 text-xs", children: "\u4FDD\u5B58" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setShowNewKeyForm(false), className: "h-7 text-xs", children: "\u53D6\u6D88" })] })] })), _jsx("div", { className: "space-y-2", children: apiKeys.length === 0 ? (_jsx("div", { className: "py-8 text-center text-sm text-neutral-400", children: "\u6682\u65E0 API Key\uFF0C\u70B9\u51FB\u4E0A\u65B9\u6309\u94AE\u6DFB\u52A0" })) : (apiKeys.map((apiKey) => (_jsxs("div", { className: "flex items-center gap-2 rounded-md border border-neutral-200 bg-white p-3", children: [_jsx("div", { className: "flex-1 min-w-0", children: editingKeyId === apiKey.id ? (_jsx("div", { className: "flex items-center gap-2", children: _jsx(Input, { defaultValue: apiKey.label, className: "h-7 text-xs", autoFocus: true, onBlur: (e) => handleSaveEdit(apiKey.id, e.target.value), onKeyDown: (e) => {
                                                    if (e.key === 'Enter') {
                                                        handleSaveEdit(apiKey.id, e.currentTarget.value);
                                                    }
                                                    else if (e.key === 'Escape') {
                                                        setEditingKeyId(null);
                                                    }
                                                } }) })) : (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium text-neutral-700", children: apiKey.label }), _jsx("span", { className: "text-xs text-neutral-400", children: PROVIDERS.find(p => p.value === apiKey.provider)?.label })] }), _jsx("div", { className: "mt-1 font-mono text-xs text-neutral-500", children: apiKey.maskedKey })] })) }), _jsxs("div", { className: "flex items-center gap-1", children: [testResult?.keyId === apiKey.id && (_jsx("span", { className: cn('mr-2 text-xs', testResult.success ? 'text-green-600' : 'text-red-600'), children: testResult.message })), _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7", onClick: () => handleEditKey(apiKey.id), title: "\u7F16\u8F91\u6807\u7B7E", children: _jsx(Edit2, { className: "h-3 w-3" }) }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7", onClick: () => handleTestConnection(apiKey.id), disabled: testingKeyId === apiKey.id, title: "\u6D4B\u8BD5\u8FDE\u63A5", children: _jsx(TestTube, { className: cn('h-3 w-3', testingKeyId === apiKey.id && 'animate-spin') }) }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-red-500", onClick: () => handleDeleteKey(apiKey.id), title: "\u5220\u9664", children: _jsx(Trash2, { className: "h-3 w-3" }) })] })] }, apiKey.id)))) })] })), activeTab === 'models' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h4", { className: "text-sm font-medium text-neutral-700", children: "\u6A21\u578B\u914D\u7F6E" }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => setShowNewModelForm(!showNewModelForm), className: "h-7 text-xs", children: [_jsx(Plus, { className: "mr-1 h-3 w-3" }), "\u6DFB\u52A0\u81EA\u5B9A\u4E49"] })] }), showNewModelForm && (_jsxs("div", { className: "space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs text-neutral-600", children: "\u6A21\u578B\u540D\u79F0" }), _jsx(Input, { value: newModelForm.name, onChange: (e) => setNewModelForm({ ...newModelForm, name: e.target.value }), placeholder: "\u4F8B\u5982\uFF1AGPT-4 Custom", className: "h-8 text-xs" })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs text-neutral-600", children: "\u670D\u52A1\u5546" }), _jsx(Select, { value: newModelForm.provider, onValueChange: (value) => setNewModelForm({ ...newModelForm, provider: value }), children: PROVIDERS.map((provider) => (_jsx(SelectItem, { value: provider.value, children: provider.label }, provider.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs text-neutral-600", children: "\u6A21\u578B ID" }), _jsx(Input, { value: newModelForm.modelId, onChange: (e) => setNewModelForm({ ...newModelForm, modelId: e.target.value }), placeholder: "\u4F8B\u5982\uFF1Agpt-4-custom", className: "h-8 text-xs" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", onClick: handleAddModel, className: "h-7 text-xs", children: "\u4FDD\u5B58" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setShowNewModelForm(false), className: "h-7 text-xs", children: "\u53D6\u6D88" })] })] })), _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-xs font-medium text-neutral-500", children: "\u9884\u8BBE\u6A21\u578B" }), PRESET_MODELS.map((model) => (_jsxs("div", { className: "flex items-center justify-between rounded-md border border-neutral-200 bg-white p-2.5", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-neutral-700", children: model.name }), _jsxs("div", { className: "text-xs text-neutral-400", children: [PROVIDERS.find(p => p.value === model.provider)?.label, " \u2022 ", model.modelId] })] }), _jsx("span", { className: "text-xs text-neutral-400", children: "\u9884\u8BBE" })] }, model.id))), customModels.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "mt-4 text-xs font-medium text-neutral-500", children: "\u81EA\u5B9A\u4E49\u6A21\u578B" }), customModels.map((model) => (_jsxs("div", { className: "flex items-center justify-between rounded-md border border-neutral-200 bg-white p-2.5", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-neutral-700", children: model.name }), _jsxs("div", { className: "text-xs text-neutral-400", children: [PROVIDERS.find(p => p.value === model.provider)?.label, " \u2022 ", model.modelId] })] }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-red-500", onClick: () => handleDeleteModel(model.id), title: "\u5220\u9664", children: _jsx(Trash2, { className: "h-3 w-3" }) })] }, model.id)))] }))] })] })), activeTab === 'preferences' && (_jsxs("div", { className: "space-y-4", children: [_jsx("h4", { className: "text-sm font-medium text-neutral-700", children: "\u504F\u597D\u8BBE\u7F6E" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-sm text-neutral-600", children: "\u9ED8\u8BA4\u6A21\u578B" }), _jsx(Select, { value: preferences.defaultModel, onValueChange: (value) => {
                                                setPreferences({ ...preferences, defaultModel: value });
                                                saveSettings();
                                            }, children: allModels.map((model) => (_jsxs(SelectItem, { value: model.id, children: [model.name, " (", PROVIDERS.find(p => p.value === model.provider)?.label, ")"] }, model.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-sm text-neutral-600", children: "\u8D85\u65F6\u65F6\u95F4\uFF08\u6BEB\u79D2\uFF09" }), _jsx(Input, { type: "number", value: preferences.timeout, onChange: (e) => {
                                                const value = parseInt(e.target.value) || 30000;
                                                setPreferences({ ...preferences, timeout: value });
                                                saveSettings();
                                            }, className: "h-9" }), _jsx("p", { className: "mt-1 text-xs text-neutral-400", children: "\u8BF7\u6C42\u8D85\u65F6\u65F6\u95F4\uFF0C\u9ED8\u8BA4 30000ms\uFF0830\u79D2\uFF09" })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-sm text-neutral-600", children: "\u6700\u5927\u91CD\u8BD5\u6B21\u6570" }), _jsx(Input, { type: "number", value: preferences.maxRetries, onChange: (e) => {
                                                const value = parseInt(e.target.value) || 3;
                                                setPreferences({ ...preferences, maxRetries: value });
                                                saveSettings();
                                            }, className: "h-9", min: "0", max: "10" }), _jsx("p", { className: "mt-1 text-xs text-neutral-400", children: "\u8BF7\u6C42\u5931\u8D25\u65F6\u7684\u91CD\u8BD5\u6B21\u6570\uFF0C\u9ED8\u8BA4 3 \u6B21" })] })] })] }))] }) }));
}
