// UNDERSTAND/CLARIFY/ROOT_CONCERN → a question; TEACHING → the documented teaching;
// REFLECT → what it may mean (the quiet "something became clearer" moment); ACTION; REVIEW.
export function stageGroup(stage = '') {
  const s = String(stage).toLowerCase();
  if (/follow|review/.test(s)) return 'review';
  if (/action/.test(s)) return 'action';
  if (/choose|choice|clarify|root/.test(s)) return 'choice';
  if (/principle|teaching/.test(s)) return 'principle';
  if (/reflect|insight/.test(s)) return 'insight';
  return 'understand';
}

export const pickId = (obj) => obj?.id ?? obj?.sessionId;

const toText = (o) => (typeof o === 'string' ? o : o?.text ?? o?.label ?? '');

// "Something else" becomes the "write your own" space instead of a button.
const isElse = (s) => /^something else\.?$/i.test(s.trim());

// Source line for the teaching card; adjust once we see your real teaching object.
function formatSource(t) {
  const src = t.source ?? t.citation ?? t.reference;
  if (typeof src === 'string') return src;
  const o = src && typeof src === 'object' ? src : t;
  return [o.work ?? o.title, o.volume, o.chapter, o.page].filter(Boolean).map(String).join(', ');
}

export function normalize(raw) {
  const s = raw ?? {};

  const thoughts = (s.messages ?? []).map((m) => ({
    role: String(m.sender).toUpperCase() === 'USER' ? 'user' : 'mentor',
    text: m.text ?? '',
    mode: m.mode,
    meta: m.metadata ?? {},
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

  return {
    id: pickId(raw),
    stage: currentStage,
    group: stageGroup(currentStage),
    thoughts,
    principle,
    actionId: s.actionId ?? s.action?.id ?? s.action_id ?? (s.actions && s.actions.length > 0 ? s.actions[s.actions.length - 1].id : null),
  };
}