import { useState, useEffect } from 'react'
import { Settings, Plus, Trash2, Edit2, Check, X, TestTube, Loader2 } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { API_BASE } from '@/lib/api-config'

// 类型定义（与后端API一致）
interface ApiKey {
  id: string
  provider: string
  name: string
  apiKey: string
  baseUrl?: string | null
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

interface ModelConfig {
  id: string
  provider: string
  modelId: string
  displayName: string
  maxTokens?: number | null
}

interface UserPreferences {
  id?: string
  userId?: string | null
  defaultLlmModel?: string | null
  defaultAiProcessorModel?: string | null
  defaultWorkflowGenModel?: string | null
  requestTimeout?: number
  maxRetries?: number
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'zhipu', label: '智谱AI' },
  { value: 'custom', label: '自定义' },
]

interface SettingsSidebarProps {
  open: boolean
  onClose: () => void
}

export function SettingsSidebar({ open, onClose }: SettingsSidebarProps) {
  const [activeTab, setActiveTab] = useState('api-keys')

  // API Keys 状态
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null)
  const [newKeyForm, setNewKeyForm] = useState({ provider: 'openai', name: '', apiKey: '', baseUrl: '' })
  const [showNewKeyForm, setShowNewKeyForm] = useState(false)
  const [loadingKeys, setLoadingKeys] = useState(false)

  // Models 状态
  const [models, setModels] = useState<ModelConfig[]>([])
  const [newModelForm, setNewModelForm] = useState({ displayName: '', provider: 'openai', modelId: '', maxTokens: '' })
  const [showNewModelForm, setShowNewModelForm] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)

  // Preferences 状态
  const [preferences, setPreferences] = useState<UserPreferences>({})
  const [loadingPrefs, setLoadingPrefs] = useState(false)

  // 测试连接状态
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ keyId: string; success: boolean; message: string } | null>(null)

  // 错误状态
  const [error, setError] = useState<string | null>(null)

  // 从后端API加载配置
  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    try {
      await Promise.all([loadApiKeys(), loadModels(), loadPreferences()])
    } catch (error) {
      console.error('加载设置失败:', error)
      setError('加载设置失败，请刷新页面重试')
    }
  }

  const loadApiKeys = async () => {
    setLoadingKeys(true)
    try {
      const response = await fetch(`${API_BASE}/settings/keys`)
      if (!response.ok) throw new Error('获取API Keys失败')
      const data = await response.json()
      setApiKeys(data)
    } catch (error) {
      console.error('加载API Keys失败:', error)
      throw error
    } finally {
      setLoadingKeys(false)
    }
  }

  const loadModels = async () => {
    setLoadingModels(true)
    try {
      const response = await fetch(`${API_BASE}/settings/models`)
      if (!response.ok) throw new Error('获取模型失败')
      const data = await response.json()
      setModels(data)
    } catch (error) {
      console.error('加载模型失败:', error)
      throw error
    } finally {
      setLoadingModels(false)
    }
  }

  const loadPreferences = async () => {
    setLoadingPrefs(true)
    try {
      const response = await fetch(`${API_BASE}/settings/preferences`)
      if (!response.ok) throw new Error('获取偏好设置失败')
      const data = await response.json()
      setPreferences(data)
    } catch (error) {
      console.error('加载偏好设置失败:', error)
      throw error
    } finally {
      setLoadingPrefs(false)
    }
  }

  // 脱敏 API Key
  const maskApiKey = (key: string): string => {
    if (key.length <= 8) return '*'.repeat(key.length)
    return key.slice(0, 4) + '*'.repeat(key.length - 8) + key.slice(-4)
  }

  // API Keys 操作
  const handleAddKey = async () => {
    if (!newKeyForm.apiKey.trim() || !newKeyForm.name.trim()) return

    setLoadingKeys(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/settings/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: newKeyForm.provider,
          name: newKeyForm.name,
          apiKey: newKeyForm.apiKey,
          baseUrl: newKeyForm.baseUrl || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '添加API Key失败')
      }

      await loadApiKeys()
      setNewKeyForm({ provider: 'openai', name: '', apiKey: '', baseUrl: '' })
      setShowNewKeyForm(false)
    } catch (error: any) {
      console.error('添加API Key失败:', error)
      setError(error.message || '添加API Key失败')
    } finally {
      setLoadingKeys(false)
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    setLoadingKeys(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/settings/keys/${keyId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '删除API Key失败')
      }

      await loadApiKeys()
    } catch (error: any) {
      console.error('删除API Key失败:', error)
      setError(error.message || '删除API Key失败')
    } finally {
      setLoadingKeys(false)
    }
  }

  const handleEditKey = (keyId: string) => {
    setEditingKeyId(keyId)
    setTestResult(null)
  }

  const handleSaveEdit = async (keyId: string, newName: string) => {
    setLoadingKeys(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/settings/keys/${keyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '更新API Key失败')
      }

      await loadApiKeys()
      setEditingKeyId(null)
    } catch (error: any) {
      console.error('更新API Key失败:', error)
      setError(error.message || '更新API Key失败')
    } finally {
      setLoadingKeys(false)
    }
  }

  const handleTestConnection = async (keyId: string) => {
    setTestingKeyId(keyId)
    setTestResult(null)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/settings/keys/${keyId}/test`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '测试连接失败')
      }

      const result = await response.json()
      setTestResult({
        keyId,
        success: result.success,
        message: result.message || '连接测试成功',
      })
    } catch (error: any) {
      console.error('测试连接失败:', error)
      setTestResult({
        keyId,
        success: false,
        message: error.message || '测试连接失败',
      })
    } finally {
      setTestingKeyId(null)
    }
  }

  // Models 操作
  const handleAddModel = async () => {
    if (!newModelForm.displayName.trim() || !newModelForm.modelId.trim()) return

    setLoadingModels(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/settings/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: newModelForm.provider,
          modelId: newModelForm.modelId,
          displayName: newModelForm.displayName,
          maxTokens: newModelForm.maxTokens ? parseInt(newModelForm.maxTokens) : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '添加模型失败')
      }

      await loadModels()
      setNewModelForm({ displayName: '', provider: 'openai', modelId: '', maxTokens: '' })
      setShowNewModelForm(false)
    } catch (error: any) {
      console.error('添加模型失败:', error)
      setError(error.message || '添加模型失败')
    } finally {
      setLoadingModels(false)
    }
  }

  const handleDeleteModel = async (modelId: string) => {
    setLoadingModels(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/settings/models/${modelId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '删除模型失败')
      }

      await loadModels()
    } catch (error: any) {
      console.error('删除模型失败:', error)
      setError(error.message || '删除模型失败')
    } finally {
      setLoadingModels(false)
    }
  }

  // 获取所有可用模型选项
  const allModels = models

  // 偏好设置操作
  const handleUpdatePreferences = async (updates: Partial<UserPreferences>) => {
    setLoadingPrefs(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/settings/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '更新偏好设置失败')
      }

      const updated = await response.json()
      setPreferences(updated)
    } catch (error: any) {
      console.error('更新偏好设置失败:', error)
      setError(error.message || '更新偏好设置失败')
    } finally {
      setLoadingPrefs(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} side="right" title="设置">
      <div className="space-y-6">
        {/* Tabs 导航 */}
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
          <button
            onClick={() => setActiveTab('api-keys')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === 'api-keys'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            )}
          >
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === 'models'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            )}
          >
            Models
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === 'preferences'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            )}
          >
            Preferences
          </button>
        </div>

        {/* API Keys 面板 */}
        {activeTab === 'api-keys' && (
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 text-red-800 underline"
                >
                  关闭
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-neutral-700">API 密钥管理</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewKeyForm(!showNewKeyForm)}
                className="h-7 text-xs"
                disabled={loadingKeys}
              >
                <Plus className="mr-1 h-3 w-3" />
                添加
              </Button>
            </div>

            {showNewKeyForm && (
              <div className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div>
                  <label className="mb-1 block text-xs text-neutral-600">服务商</label>
                  <Select
                    value={newKeyForm.provider}
                    onValueChange={(value) => setNewKeyForm({ ...newKeyForm, provider: value })}
                  >
                    {PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-600">名称</label>
                  <Input
                    value={newKeyForm.name}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                    placeholder="例如：生产环境"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-600">API Key</label>
                  <Input
                    type="password"
                    value={newKeyForm.apiKey}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="h-8 text-xs"
                  />
                </div>
                {newKeyForm.provider === 'custom' && (
                  <div>
                    <label className="mb-1 block text-xs text-neutral-600">自定义端点</label>
                    <Input
                      value={newKeyForm.baseUrl}
                      onChange={(e) => setNewKeyForm({ ...newKeyForm, baseUrl: e.target.value })}
                      placeholder="https://api.example.com"
                      className="h-8 text-xs"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddKey}
                    className="h-7 text-xs"
                    disabled={loadingKeys}
                  >
                    {loadingKeys ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : '保存'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewKeyForm(false)}
                    className="h-7 text-xs"
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {loadingKeys ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-400">
                  暂无 API Key，点击上方按钮添加
                </div>
              ) : (
                apiKeys.map((apiKey) => (
                  <div
                    key={apiKey.id}
                    className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white p-3"
                  >
                    <div className="flex-1 min-w-0">
                      {editingKeyId === apiKey.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            defaultValue={apiKey.name}
                            className="h-7 text-xs"
                            autoFocus
                            onBlur={(e) => handleSaveEdit(apiKey.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit(apiKey.id, e.currentTarget.value)
                              } else if (e.key === 'Escape') {
                                setEditingKeyId(null)
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-neutral-700">
                              {apiKey.name}
                            </span>
                            <span className="text-xs text-neutral-400">
                              {PROVIDERS.find(p => p.value === apiKey.provider)?.label}
                            </span>
                          </div>
                          <div className="mt-1 font-mono text-xs text-neutral-500">
                            {maskApiKey(apiKey.apiKey)}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {testResult?.keyId === apiKey.id && (
                        <span
                          className={cn(
                            'mr-2 text-xs',
                            testResult.success ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          {testResult.message}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditKey(apiKey.id)}
                        title="编辑名称"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleTestConnection(apiKey.id)}
                        disabled={testingKeyId === apiKey.id || loadingKeys}
                        title="测试连接"
                      >
                        {testingKeyId === apiKey.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <TestTube className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500"
                        onClick={() => handleDeleteKey(apiKey.id)}
                        disabled={loadingKeys}
                        title="删除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Models 面板 */}
        {activeTab === 'models' && (
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 text-red-800 underline"
                >
                  关闭
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-neutral-700">模型配置</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewModelForm(!showNewModelForm)}
                className="h-7 text-xs"
                disabled={loadingModels}
              >
                <Plus className="mr-1 h-3 w-3" />
                添加自定义
              </Button>
            </div>

            {showNewModelForm && (
              <div className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div>
                  <label className="mb-1 block text-xs text-neutral-600">模型名称</label>
                  <Input
                    value={newModelForm.displayName}
                    onChange={(e) => setNewModelForm({ ...newModelForm, displayName: e.target.value })}
                    placeholder="例如：GPT-4 Custom"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-600">服务商</label>
                  <Select
                    value={newModelForm.provider}
                    onValueChange={(value) => setNewModelForm({ ...newModelForm, provider: value })}
                  >
                    {PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-600">模型 ID</label>
                  <Input
                    value={newModelForm.modelId}
                    onChange={(e) => setNewModelForm({ ...newModelForm, modelId: e.target.value })}
                    placeholder="例如：gpt-4-custom"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-600">最大Token数（可选）</label>
                  <Input
                    type="number"
                    value={newModelForm.maxTokens}
                    onChange={(e) => setNewModelForm({ ...newModelForm, maxTokens: e.target.value })}
                    placeholder="例如：128000"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddModel}
                    className="h-7 text-xs"
                    disabled={loadingModels}
                  >
                    {loadingModels ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : '保存'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewModelForm(false)}
                    className="h-7 text-xs"
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {loadingModels ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
              ) : models.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-400">
                  暂无模型，请添加预设模型或自定义模型
                </div>
              ) : (
                models.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between rounded-md border border-neutral-200 bg-white p-2.5"
                  >
                    <div>
                      <div className="text-sm font-medium text-neutral-700">{model.displayName}</div>
                      <div className="text-xs text-neutral-400">
                        {PROVIDERS.find(p => p.value === model.provider)?.label} • {model.modelId}
                        {model.maxTokens && ` • ${model.maxTokens.toLocaleString()} tokens`}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500"
                      onClick={() => handleDeleteModel(model.id)}
                      disabled={loadingModels}
                      title="删除"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Preferences 面板 */}
        {activeTab === 'preferences' && (
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 text-red-800 underline"
                >
                  关闭
                </button>
              </div>
            )}

            <h4 className="text-sm font-medium text-neutral-700">偏好设置</h4>

            {loadingPrefs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-sm text-neutral-600">默认LLM模型</label>
                  <Select
                    value={preferences.defaultLlmModel || ''}
                    onValueChange={(value) => handleUpdatePreferences({ defaultLlmModel: value })}
                  >
                    {allModels.map((model) => (
                      <SelectItem key={model.id} value={model.modelId}>
                        {model.displayName} ({PROVIDERS.find(p => p.value === model.provider)?.label})
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-neutral-600">默认AI处理器模型</label>
                  <Select
                    value={preferences.defaultAiProcessorModel || ''}
                    onValueChange={(value) => handleUpdatePreferences({ defaultAiProcessorModel: value })}
                  >
                    {allModels.map((model) => (
                      <SelectItem key={model.id} value={model.modelId}>
                        {model.displayName} ({PROVIDERS.find(p => p.value === model.provider)?.label})
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-neutral-600">默认工作流生成模型</label>
                  <Select
                    value={preferences.defaultWorkflowGenModel || ''}
                    onValueChange={(value) => handleUpdatePreferences({ defaultWorkflowGenModel: value })}
                  >
                    {allModels.map((model) => (
                      <SelectItem key={model.id} value={model.modelId}>
                        {model.displayName} ({PROVIDERS.find(p => p.value === model.provider)?.label})
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-neutral-600">
                    超时时间（毫秒）
                  </label>
                  <Input
                    type="number"
                    value={preferences.requestTimeout || 30000}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 30000
                      handleUpdatePreferences({ requestTimeout: value })
                    }}
                    className="h-9"
                    disabled={loadingPrefs}
                  />
                  <p className="mt-1 text-xs text-neutral-400">
                    请求超时时间，默认 30000ms（30秒）
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-neutral-600">
                    最大重试次数
                  </label>
                  <Input
                    type="number"
                    value={preferences.maxRetries || 2}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 2
                      handleUpdatePreferences({ maxRetries: value })
                    }}
                    className="h-9"
                    min="0"
                    max="10"
                    disabled={loadingPrefs}
                  />
                  <p className="mt-1 text-xs text-neutral-400">
                    请求失败时的重试次数，默认 2 次
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}
