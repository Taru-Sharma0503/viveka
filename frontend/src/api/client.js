const BASE = import.meta.env.VITE_API_BASE ? `${import.meta.env.VITE_API_BASE}/api/v1` : '/api/v1';

// Backend replies { success, data, error }.
// We return `data`, or throw the real error.
async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json = null;

  try {
    json = await res.json();
  } catch {
    // No JSON response body.
  }

  if (!res.ok || json?.success === false) {
    const error = json?.error;
    const message =
      (typeof error === 'string' ? error : error?.message) ||
      `Request failed (${res.status})`;

    throw new Error(message);
  }

  return json?.data ?? json;
};

// POST /api/v1/sessions
export const createSession = (topic) =>
  request('/sessions', {
    method: 'POST',
    body: { topic },
  });

// GET /api/v1/sessions/:sessionId
export const getSession = (sessionId) =>
  request(`/sessions/${sessionId}`);

// POST /api/v1/sessions/:sessionId/messages
export const sendMessage = (sessionId, message) =>
  request(`/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: { message },
  });

// POST /api/v1/sessions/:sessionId/actions
export const createAction = (sessionId, actionText) =>
  request(`/sessions/${sessionId}/actions`, {
    method: 'POST',
    body: { actionText },
  });

// POST /api/v1/actions/:actionId/review
export const reviewAction = (actionId, payload = {}) => {
  const status = payload.status || 'COMPLETED';

  const note =
    payload.note ||
    [payload.understood, payload.chose, payload.learned]
      .filter(Boolean)
      .join('\n\n') ||
    null;

  const helpfulnessRating = payload.helpfulnessRating || null;

  return request(`/actions/${actionId}/review`, {
    method: 'POST',
    body: {
      status,
      note,
      helpfulnessRating,
    },
  });
};

// GET /api/v1/passages/:passageId
export const getPassage = (passageId) =>
  request(`/passages/${passageId}`);

// DELETE /api/v1/sessions/:sessionId
export const deleteSession = (sessionId) =>
  request(`/sessions/${sessionId}`, {
    method: 'DELETE',
  });