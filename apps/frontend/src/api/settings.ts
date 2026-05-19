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

interface Model {
  id: string
  provider: string
  modelId: string
  displayName: string
  maxTokens?: number | null
}

interface Preferences {
  defaultLlmModel?: string | null
  defaultAiProcessorModel?: string | null
  defaultWorkflowGenModel?: string | null
  requestTimeout?: number
  maxRetries?: number
}

const API_BASE = '/api/settings'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || res.statusText)
  }
  return res.json()
}

// API Keys
export async function listApiKeys(): Promise<ApiKey[]> {
  return request<{ apiKeys: ApiKey[] }>(`${API_BASE}/keys`).then(r => r.apiKeys)
}

export async function createApiKey(data: {
  provider: string
  name: string
  apiKey: string
  baseUrl?: string
}): Promise<ApiKey> {
  return request<ApiKey>(`${API_BASE}/keys`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateApiKey(
  id: string,
  data: Partial<Omit<ApiKey, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ApiKey> {
  return request<ApiKey>(`${API_BASE}/keys/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteApiKey(id: string): Promise<void> {
  await request(`${API_BASE}/keys/${id}`, { method: 'DELETE' })
}

export async function testApiKey(id: string): Promise<{ success: boolean; message?: string }> {
  return request<{ success: boolean; message?: string }>(`${API_BASE}/keys/${id}/test`, {
    method: 'POST',
  })
}

// Models
export async function listModels(): Promise<Model[]> {
  return request<{ models: Model[] }>(`${API_BASE}/models`).then(r => r.models)
}

export async function createModel(data: {
  provider: string
  modelId: string
  displayName: string
  maxTokens?: number
}): Promise<Model> {
  return request<Model>(`${API_BASE}/models`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteModel(id: string): Promise<void> {
  await request(`${API_BASE}/models/${id}`, { method: 'DELETE' })
}

// Preferences
export async function getPreferences(): Promise<Preferences> {
  return request<Preferences>(`${API_BASE}/preferences`)
}

export async function updatePreferences(data: Partial<Preferences>): Promise<Preferences> {
  return request<Preferences>(`${API_BASE}/preferences`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export type { ApiKey, Model, Preferences }
