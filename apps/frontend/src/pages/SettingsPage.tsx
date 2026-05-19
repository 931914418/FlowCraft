import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Key,
  Plus,
  Trash2,
  Loader2,
  Check,
  X,
  Settings as SettingsIcon,
  Save,
  AlertCircle,
} from 'lucide-react'
import {
  listApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  testApiKey,
  getPreferences,
  updatePreferences,
  listModels,
  type ApiKey,
  type Preferences,
  type Model,
} from '@/api/settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  zhipu: '智谱 AI (GLM)',
  custom: '自定义',
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-100 text-green-800 border-green-200',
  anthropic: 'bg-orange-100 text-orange-800 border-orange-200',
  zhipu: 'bg-blue-100 text-blue-800 border-blue-200',
  custom: 'bg-gray-100 text-gray-800 border-gray-200',
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message?: string }>>({})

  // New API Key form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newKey, setNewKey] = useState({
    provider: 'openai',
    name: '',
    apiKey: '',
    baseUrl: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [keysData, modelsData, prefsData] = await Promise.all([
        listApiKeys(),
        listModels(),
        getPreferences(),
      ])
      setApiKeys(keysData)
      setModels(modelsData)
      setPreferences(prefsData)
    } catch (err: any) {
      setError(err.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAddKey = async () => {
    if (!newKey.name || !newKey.apiKey) {
      setError('请填写名称和 API Key')
      return
    }

    try {
      await createApiKey({
        provider: newKey.provider,
        name: newKey.name,
        apiKey: newKey.apiKey,
        baseUrl: newKey.baseUrl || undefined,
      })
      setShowAddForm(false)
      setNewKey({ provider: 'openai', name: '', apiKey: '', baseUrl: '' })
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to add API key')
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!window.confirm('确定删除此 API Key？')) return
    try {
      await deleteApiKey(id)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete API key')
    }
  }

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await updateApiKey(id, { isEnabled: enabled })
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to update API key')
    }
  }

  const handleTestKey = async (id: string) => {
    setTestingId(id)
    try {
      const result = await testApiKey(id)
      setTestResults(prev => ({ ...prev, [id]: result }))
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, [id]: { success: false, message: err.message } }))
    } finally {
      setTestingId(null)
    }
  }

  const handleSavePreferences = async () => {
    if (!preferences) return
    try {
      await updatePreferences(preferences)
      alert('设置已保存')
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-3 text-slate-400">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-5 w-5 text-slate-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-700">
              设置
            </h1>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')}>
            返回
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-6 space-y-6">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <button
              className="ml-auto text-red-700 hover:text-red-900"
              onClick={() => setError(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* API Keys Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>API Keys</CardTitle>
              <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="mr-1.5 h-4 w-4" />
                添加
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showAddForm && (
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div>
                  <Label>提供商</Label>
                  <Select
                    value={newKey.provider}
                    onValueChange={(value) => setNewKey({ ...newKey, provider: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>名称</Label>
                  <Input
                    placeholder="My OpenAI Key"
                    value={newKey.name}
                    onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={newKey.apiKey}
                    onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                  />
                </div>
                {(newKey.provider === 'custom' || newKey.provider === 'zhipu') && (
                  <div>
                    <Label>Base URL（可选）</Label>
                    <Input
                      placeholder="https://api.example.com/v1"
                      value={newKey.baseUrl}
                      onChange={(e) => setNewKey({ ...newKey, baseUrl: e.target.value })}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddKey}>
                    保存
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                    取消
                  </Button>
                </div>
              </div>
            )}

            {apiKeys.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                <Key className="mx-auto mb-2 h-8 w-8" />
                暂无 API Key，点击上方按钮添加
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => {
                  const testResult = testResults[key.id]
                  const isTesting = testingId === key.id

                  return (
                    <div
                      key={key.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700">{key.name}</span>
                          <Badge
                            variant="outline"
                            className={PROVIDER_COLORS[key.provider] || 'bg-gray-100'}
                          >
                            {PROVIDER_LABELS[key.provider] || key.provider}
                          </Badge>
                          {!key.isEnabled && (
                            <Badge variant="secondary" className="text-xs">
                              已禁用
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 font-mono">
                          {key.apiKey}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={key.isEnabled}
                          onCheckedChange={(checked) => handleToggleEnabled(key.id, checked)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestKey(key.id)}
                          disabled={isTesting || !key.isEnabled}
                        >
                          {isTesting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : testResult ? (
                            testResult.success ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <X className="h-3 w-3 text-red-600" />
                            )
                          ) : (
                            '测试'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteKey(key.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preferences Section */}
        {preferences && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>默认模型设置</CardTitle>
                <Button size="sm" onClick={handleSavePreferences}>
                  <Save className="mr-1.5 h-4 w-4" />
                  保存
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>LLM 节点默认模型</Label>
                  <Select
                    value={preferences.defaultLlmModel || ''}
                    onValueChange={(value) =>
                      setPreferences({ ...preferences, defaultLlmModel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择默认模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.modelId}>
                          {model.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>AI 处理器默认模型</Label>
                  <Select
                    value={preferences.defaultAiProcessorModel || ''}
                    onValueChange={(value) =>
                      setPreferences({ ...preferences, defaultAiProcessorModel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择默认模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.modelId}>
                          {model.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>工作流生成默认模型</Label>
                  <Select
                    value={preferences.defaultWorkflowGenModel || ''}
                    onValueChange={(value) =>
                      setPreferences({ ...preferences, defaultWorkflowGenModel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择默认模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.modelId}>
                          {model.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>请求超时（毫秒）</Label>
                    <Input
                      type="number"
                      value={preferences.requestTimeout || 30000}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          requestTimeout: parseInt(e.target.value) || 30000,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>最大重试次数</Label>
                    <Input
                      type="number"
                      value={preferences.maxRetries || 2}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          maxRetries: parseInt(e.target.value) || 2,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Models Section */}
        <Card>
          <CardHeader>
            <CardTitle>可用模型</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                >
                  <div className="font-medium text-slate-700">{model.displayName}</div>
                  <div className="mt-1 text-xs text-slate-500">{model.modelId}</div>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {PROVIDER_LABELS[model.provider] || model.provider}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
