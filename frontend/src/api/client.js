const BASE = import.meta.env.VITE_API_BASE || '/api/v1';

// Backend replies { success, data, error }. We return `data`, or throw the real error.
async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json = null;
  try { json = await res.json(); } catch { /* no JSON body */ }

  if (!res.ok || json?.success === false) {
    const e = json?.error;
    const msg = (typeof e === 'string' ? e : e?.message) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json?.data ?? json;
}

// POST /sessions  { topic, initialMessage? }
export const createSession = (topic, initialMessage) =>
  request('/sessions', {
    method: 'POST',
    body: initialMessage ? { topic, initialMessage } : { topic },
  });

// GET /sessions/:sessionId
export const getSession = (sessionId) => request(`/sessions/${sessionId}`);

// POST /sessions/:sessionId/messages  { message }
export const sendMessage = (sessionId, message) =>
  request(`/sessions/${sessionId}/messages`, { method: 'POST', body: { message } });

// POST /sessions/:sessionId/actions  { actionText }
export const createAction = (sessionId, actionText) =>
  request(`/sessions/${sessionId}/actions`, { method: 'POST', body: { actionText } });

// POST /actions/:actionId/review  { status, note, helpfulnessRating }
export const reviewAction = (actionId, payload) =>
  request(`/actions/${actionId}/review`, { method: 'POST', body: payload });