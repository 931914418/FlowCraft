const API_BASE = '/api/workflows';
class ApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}
async function request(url, options) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const body = await res.text().catch(() => res.statusText);
        throw new ApiError(typeof body === 'string' ? body : res.statusText, res.status);
    }
    return res.json();
}
function unwrap(row) {
    return {
        ...row.definition,
        id: row.id,
        name: row.name,
        webhookPath: row.webhookPath ?? row.definition?.webhookPath,
        webhookSecret: row.webhookSecret ?? row.definition?.webhookSecret,
    };
}
export async function listWorkflows() {
    const rows = await request(API_BASE);
    return rows.map(unwrap);
}
export async function getWorkflow(id) {
    const row = await request(`${API_BASE}/${id}`);
    return unwrap(row);
}
export async function saveWorkflow(workflow) {
    const row = await request(API_BASE, {
        method: 'POST',
        body: JSON.stringify(workflow),
    });
    return unwrap(row);
}
export async function updateWorkflow(id, workflow) {
    await request(`${API_BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(workflow),
    });
}
export async function deleteWorkflow(id) {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        throw new ApiError(res.statusText, res.status);
    }
}
export async function runWorkflow(id) {
    return request(`${API_BASE}/${id}/run`, {
        method: 'POST',
    });
}
export function connectExecutionSSE(executionId, onEvent, onError, onComplete) {
    const BACKEND_URL = 'http://localhost:3002';
    const url = `${BACKEND_URL}/api/workflows/execution/${executionId}/stream`;
    let aborted = false;
    let timeoutId = null;
    // Use fetch + ReadableStream instead of EventSource for better compatibility
    fetch(url, {
        headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
        },
    })
        .then(async (response) => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Response body is null');
        }
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let currentData = '';
        while (!aborted) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.trim() === '') {
                    // Empty line signals end of event
                    if (currentEvent && currentData) {
                        try {
                            const parsed = JSON.parse(currentData);
                            // Handle different event types
                            if (currentEvent === 'end') {
                                onComplete?.();
                                return;
                            }
                            else if (currentEvent === 'status') {
                                // Extract node events from status data
                                if (parsed.nodes && Array.isArray(parsed.nodes)) {
                                    parsed.nodes.forEach((node) => {
                                        onEvent(node);
                                    });
                                }
                            }
                            else if (currentEvent === 'node') {
                                // Single node event
                                onEvent(parsed);
                            }
                        }
                        catch (e) {
                            console.error('Failed to parse SSE event:', currentEvent, currentData, e);
                        }
                        // Reset after processing
                        currentEvent = '';
                        currentData = '';
                    }
                }
                else if (line.startsWith('event: ')) {
                    currentEvent = line.substring(7).trim();
                }
                else if (line.startsWith('data: ')) {
                    currentData = line.substring(6).trim();
                }
            }
        }
    })
        .catch((err) => {
        if (!aborted) {
            console.error('SSE fetch error:', err);
            onError?.(err);
        }
    });
    return () => {
        aborted = true;
        if (timeoutId)
            clearTimeout(timeoutId);
    };
}
export { ApiError };
