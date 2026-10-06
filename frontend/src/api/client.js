const BASE = `${import.meta.env.VITE_API_BASE}/api/v1` || '/api/v1';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// POST /api/v1/sessions
export const createSession = (text, kind) =>
  request('/sessions', { method: 'POST', body: { problem: text, kind } }); // ← MATCH

// GET /api/v1/sessions/:sessionId
export const getSession = (sessionId) => request(`/sessions/${sessionId}`);

// POST /api/v1/sessions/:sessionId/messages
export const sendMessage = (sessionId, text) =>
  request(`/sessions/${sessionId}/messages`, { method: 'POST', body: { content: text } }); // ← MATCH

// POST /api/v1/sessions/:sessionId/actions
export const createAction = (sessionId, description) =>
  request(`/sessions/${sessionId}/actions`, { method: 'POST', body: { description } }); // ← MATCH

// POST /api/v1/actions/:actionId/review
export const reviewAction = (actionId, payload) =>
  request(`/actions/${actionId}/review`, { method: 'POST', body: payload }); // ← MATCH