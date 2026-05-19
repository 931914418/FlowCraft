const API_BASE = '/api/settings';
async function request(url, options) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || res.statusText);
    }
    return res.json();
}
// API Keys
export async function listApiKeys() {
    return request(`${API_BASE}/keys`).then(r => r.apiKeys);
}
export async function createApiKey(data) {
    return request(`${API_BASE}/keys`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}
export async function updateApiKey(id, data) {
    return request(`${API_BASE}/keys/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}
export async function deleteApiKey(id) {
    await request(`${API_BASE}/keys/${id}`, { method: 'DELETE' });
}
export async function testApiKey(id) {
    return request(`${API_BASE}/keys/${id}/test`, {
        method: 'POST',
    });
}
// Models
export async function listModels() {
    return request(`${API_BASE}/models`).then(r => r.models);
}
export async function createModel(data) {
    return request(`${API_BASE}/models`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}
export async function deleteModel(id) {
    await request(`${API_BASE}/models/${id}`, { method: 'DELETE' });
}
// Preferences
export async function getPreferences() {
    return request(`${API_BASE}/preferences`);
}
export async function updatePreferences(data) {
    return request(`${API_BASE}/preferences`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}
