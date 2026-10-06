// Which "mood" of screen a backend stage should get.
export function stageGroup(stage = '') {
  const s = String(stage).toLowerCase();
  if (/follow|review/.test(s)) return 'review';
  if (/action/.test(s)) return 'action';
  if (/choose|choice|clarify|root/.test(s)) return 'choice';
  if (/principle|teaching/.test(s)) return 'principle';
  if (/reflect|insight/.test(s)) return 'insight';
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

  const lastMentorMsg = list.slice().reverse().find((m) => !isUser(m));
  const teachingObj = s.principle ?? s.teaching ?? lastMentorMsg?.metadata?.teaching ?? null;
  const principle = teachingObj
    ? {
        quote: teachingObj.quote ?? teachingObj.exactText ?? teachingObj.text,
        source:
          teachingObj.sourceWork ??
          teachingObj.source ??
          teachingObj.citation ??
          (teachingObj.work ? `${teachingObj.work}${teachingObj.section ? ', ' + teachingObj.section : ''}` : null),
      }
    : null;

  const currentStage = s.stage ?? s.currentStage ?? '';
  const questionObj = s.question ?? lastMentorMsg?.metadata?.question ?? null;
  const question = questionObj
    ? {
        text: questionObj.text || '',
        options: Array.isArray(questionObj.options) ? questionObj.options : [],
      }
    : null;

  return {
    id: pickId(raw),
    stage: currentStage,
    group: stageGroup(currentStage),
    thoughts,
    principle,
    question,
    actionId: s.actionId ?? s.action?.id ?? s.action_id ?? (s.actions && s.actions.length > 0 ? s.actions[s.actions.length - 1].id : null),
  };
}