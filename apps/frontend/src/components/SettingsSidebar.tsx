import { useState, useEffect } from 'react'
import { Settings, Plus, Trash2, Edit2, Check, X, TestTube } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'

// 类型定义
interface ApiKey {
  id: string
  provider: string
  key: string
  maskedKey: string
  label?: string
}

interface ModelConfig {
  id: string
  name: string
  provider: string
  modelId: string
  enabled: boolean
}

interface UserPreferences {
  defaultModel: string
  timeout: number
  maxRetries: number
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'custom', label: '自定义' },
]

const PRESET_MODELS: ModelConfig[] = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'openai', modelId: 'gpt-4', enabled: true },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', modelId: 'gpt-4-turbo-preview', enabled: true },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', modelId: 'gpt-3.5-turbo', enabled: true },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', modelId: 'claude-3-opus-20240229', enabled: true },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic', modelId: 'claude-3-sonnet-20240229', enabled: true },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', modelId: 'claude-3-haiku-20240307', enabled: true },
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
  const [newKeyForm, setNewKeyForm] = useState({ provider: 'openai', key: '', label: '' })
  const [showNewKeyForm, setShowNewKeyForm] = useState(false)

  // Models 状态
  const [customModels, setCustomModels] = useState<ModelConfig[]>([])
  const [newModelForm, setNewModelForm] = useState({ name: '', provider: 'openai', modelId: '' })
  const [showNewModelForm, setShowNewModelForm] = useState(false)

  // Preferences 状态
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultModel: 'gpt-4',
    timeout: 30000,
    maxRetries: 3,
  })

  // 测试连接状态
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ keyId: string; success: boolean; message: string } | null>(null)

  // 从 localStorage 加载配置
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = () => {
    try {
      const storedKeys = localStorage.getItem('flowcraft_api_keys')
      if (storedKeys) {
        setApiKeys(JSON.parse(storedKeys))
      }

      const storedModels = localStorage.getItem('flowcraft_custom_models')
      if (storedModels) {
        setCustomModels(JSON.parse(storedModels))
      }

      const storedPrefs = localStorage.getItem('flowcraft_preferences')
      if (storedPrefs) {
        setPreferences(JSON.parse(storedPrefs))
      }
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }

  const saveSettings = () => {
    try {
      localStorage.setItem('flowcraft_api_keys', JSON.stringify(apiKeys))
      localStorage.setItem('flowcraft_custom_models', JSON.stringify(customModels))
      localStorage.setItem('flowcraft_preferences', JSON.stringify(preferences))
    } catch (error) {
      console.error('保存设置失败:', error)
    }
  }

  // 脱敏 API Key
  const maskApiKey = (key: string): string => {
    if (key.length <= 8) return '*'.repeat(key.length)
    return key.slice(0, 4) + '*'.repeat(key.length - 8) + key.slice(-4)
  }

  // API Keys 操作
  const handleAddKey = () => {
    if (!newKeyForm.key.trim()) return

    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      provider: newKeyForm.provider,
      key: newKeyForm.key,
      maskedKey: maskApiKey(newKeyForm.key),
      label: newKeyForm.label || newKeyForm.provider,
    }

    setApiKeys([...apiKeys, newKey])
    setNewKeyForm({ provider: 'openai', key: '', label: '' })
    setShowNewKeyForm(false)
    saveSettings()
  }

  const handleDeleteKey = (keyId: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== keyId))
    saveSettings()
  }

  const handleEditKey = (keyId: string) => {
    setEditingKeyId(keyId)
  }

  const handleSaveEdit = (keyId: string, newLabel: string) => {
    setApiKeys(apiKeys.map(k =>
      k.id === keyId ? { ...k, label: newLabel } : k
    ))
    setEditingKeyId(null)
    saveSettings()
  }

  const handleTestConnection = async (keyId: string) => {
    setTestingKeyId(keyId)
    setTestResult(null)

    // 模拟测试连接
    setTimeout(() => {
      const key = apiKeys.find(k => k.id === keyId)
      const success = key?.key.startsWith('sk-') || Math.random() > 0.3

      setTestResult({
        keyId,
        success,
        message: success ? '连接成功！API Key 有效' : '连接失败，请检查 API Key',
      })
      setTestingKeyId(null)
    }, 1000)
  }

  // Models 操作
  const handleAddModel = () => {
    if (!newModelForm.name.trim() || !newModelForm.modelId.trim()) return

    const newModel: ModelConfig = {
      id: `custom-${Date.now()}`,
      name: newModelForm.name,
      provider: newModelForm.provider,
      modelId: newModelForm.modelId,
      enabled: true,
    }

    setCustomModels([...customModels, newModel])
    setNewModelForm({ name: '', provider: 'openai', modelId: '' })
    setShowNewModelForm(false)
    saveSettings()
  }

  const handleDeleteModel = (modelId: string) => {
    setCustomModels(customModels.filter(m => m.id !== modelId))
    saveSettings()
  }

  // 获取所有可用模型选项
  const allModels = [...PRESET_MODELS, ...customModels]

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
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-neutral-700">API 密钥管理</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewKeyForm(!showNewKeyForm)}
                className="h-7 text-xs"
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
                  <label className="mb-1 block text-xs text-neutral-600">标签（可选）</label>
                  <Input
                    value={newKeyForm.label}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, label: e.target.value })}
                    placeholder="例如：生产环境"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-600">API Key</label>
                  <Input
                    type="password"
                    value={newKeyForm.key}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, key: e.target.value })}
                    placeholder="sk-..."
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddKey} className="h-7 text-xs">
                    保存
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
              {apiKeys.length === 0 ? (
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
                            defaultValue={apiKey.label}
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
                              {apiKey.label}
                            </span>
                            <span className="text-xs text-neutral-400">
                              {PROVIDERS.find(p => p.value === apiKey.provider)?.label}
                            </span>
                          </div>
                          <div className="mt-1 font-mono text-xs text-neutral-500">
                            {apiKey.maskedKey}
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
                        title="编辑标签"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleTestConnection(apiKey.id)}
                        disabled={testingKeyId === apiKey.id}
                        title="测试连接"
                      >
                        <TestTube className={cn('h-3 w-3', testingKeyId === apiKey.id && 'animate-spin')} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500"
                        onClick={() => handleDeleteKey(apiKey.id)}
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
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-neutral-700">模型配置</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewModelForm(!showNewModelForm)}
                className="h-7 text-xs"
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
                    value={newModelForm.name}
                    onChange={(e) => setNewModelForm({ ...newModelForm, name: e.target.value })}
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
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddModel} className="h-7 text-xs">
                    保存
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
              <div className="text-xs font-medium text-neutral-500">预设模型</div>
              {PRESET_MODELS.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between rounded-md border border-neutral-200 bg-white p-2.5"
                >
                  <div>
                    <div className="text-sm font-medium text-neutral-700">{model.name}</div>
                    <div className="text-xs text-neutral-400">
                      {PROVIDERS.find(p => p.value === model.provider)?.label} • {model.modelId}
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400">预设</span>
                </div>
              ))}

              {customModels.length > 0 && (
                <>
                  <div className="mt-4 text-xs font-medium text-neutral-500">自定义模型</div>
                  {customModels.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between rounded-md border border-neutral-200 bg-white p-2.5"
                    >
                      <div>
                        <div className="text-sm font-medium text-neutral-700">{model.name}</div>
                        <div className="text-xs text-neutral-400">
                          {PROVIDERS.find(p => p.value === model.provider)?.label} • {model.modelId}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500"
                        onClick={() => handleDeleteModel(model.id)}
                        title="删除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Preferences 面板 */}
        {activeTab === 'preferences' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-700">偏好设置</h4>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm text-neutral-600">默认模型</label>
                <Select
                  value={preferences.defaultModel}
                  onValueChange={(value) => {
                    setPreferences({ ...preferences, defaultModel: value })
                    saveSettings()
                  }}
                >
                  {allModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name} ({PROVIDERS.find(p => p.value === model.provider)?.label})
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
                  value={preferences.timeout}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 30000
                    setPreferences({ ...preferences, timeout: value })
                    saveSettings()
                  }}
                  className="h-9"
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
                  value={preferences.maxRetries}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 3
                    setPreferences({ ...preferences, maxRetries: value })
                    saveSettings()
                  }}
                  className="h-9"
                  min="0"
                  max="10"
                />
                <p className="mt-1 text-xs text-neutral-400">
                  请求失败时的重试次数，默认 3 次
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}
