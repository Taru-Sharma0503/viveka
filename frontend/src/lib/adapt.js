// Which "mood" of screen a backend stage should get.
export function stageGroup(stage = '') {
  const s = String(stage).toLowerCase();
  if (/follow|review/.test(s)) return 'review';
  if (/action/.test(s)) return 'action';
  if (/choose|choice/.test(s)) return 'choice';
  if (/principle|teaching/.test(s)) return 'principle';
  if (/root|insight/.test(s)) return 'insight';
  return 'understand';
}

const isUser = (m) => ['user', 'human', 'person'].includes(String(m.role || m.sender || '').toLowerCase());

export function pickId(obj) {
  return obj?.id ?? obj?.sessionId ?? obj?.session?.id ?? obj?.session_id;
}

// Turns whatever GET /sessions/:id returns into a simple shape for the UI.
export function normalize(raw) {
  const s = raw?.session ?? raw ?? {};
  const list = s.messages ?? raw?.messages ?? [];
  const thoughts = list.map((m) => ({
    role: isUser(m) ? 'user' : 'mentor',
    text: m.content ?? m.text ?? m.message ?? '',
  }));
  const principle = s.principle ?? s.teaching ?? null; // only shown if the backend sends it
  return {
    id: pickId(raw),
    stage: s.stage,
    group: stageGroup(s.stage),
    thoughts,
    principle: principle
      ? { quote: principle.quote ?? principle.text, source: principle.source ?? principle.citation }
      : null,
    actionId: s.actionId ?? s.action?.id ?? s.action_id ?? null,
  };
}