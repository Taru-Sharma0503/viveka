const BASE = import.meta.env.VITE_API_BASE || '/api/v1';

const TOPICS = ['FAILURE', 'FEAR', 'ANGER', 'PURPOSE', 'RELATIONSHIPS', 'WORK', 'GRIEF', 'GENERAL'];

function mapKindToTopic(kind) {
  if (!kind) return 'GENERAL';
  const upper = String(kind).toUpperCase();
  if (TOPICS.includes(upper)) return upper;
  if (kind === 'trouble') return 'GENERAL';
  if (kind === 'clarity') return 'PURPOSE';
  if (kind === 'teaching') return 'GENERAL';
  return 'GENERAL';
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errMsg = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) {
        errMsg = errJson.error.message;
      }
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(errMsg);
  }

  const json = await res.json();
  if (json && json.success === false && json.error) {
    throw new Error(json.error.message || 'API request failed');
  }

  return json && json.data !== undefined ? json.data : json;
}

// POST /api/v1/sessions
export const createSession = (text, kind) =>
  request('/sessions', {
    method: 'POST',
    body: {
      initialMessage: text,
      topic: mapKindToTopic(kind),
    },
  });

// GET /api/v1/sessions/:sessionId
export const getSession = (sessionId) => request(`/sessions/${sessionId}`);

// POST /api/v1/sessions/:sessionId/messages
export const sendMessage = (sessionId, text) =>
  request(`/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: { message: text },
  });

// POST /api/v1/sessions/:sessionId/actions
export const createAction = (sessionId, description, reviewDue = null) =>
  request(`/sessions/${sessionId}/actions`, {
    method: 'POST',
    body: {
      actionText: description,
      reviewDue,
    },
  });

// POST /api/v1/actions/:actionId/review
export const reviewAction = (actionId, payload = {}) => {
  const status = payload.status || 'COMPLETED';
  const note =
    payload.note ||
    [payload.understood, payload.chose, payload.learned].filter(Boolean).join('\n\n') ||
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
export const getPassage = (passageId) => request(`/passages/${passageId}`);

// DELETE /api/v1/sessions/:sessionId
export const deleteSession = (sessionId) => request(`/sessions/${sessionId}`, { method: 'DELETE' });