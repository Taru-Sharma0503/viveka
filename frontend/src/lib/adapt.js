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
  const s = raw?.session ?? raw ?? {};

  const thoughts = (s.messages ?? raw?.messages ?? []).map((m) => ({
    role: String(m.sender || m.role || '').toUpperCase() === 'USER' ? 'user' : 'mentor',
    text: m.text ?? m.content ?? m.message ?? '',
    mode: m.mode,
    meta: m.metadata ?? {},
  }));

  const lastMentorMsg = [...thoughts].reverse().find((t) => t.role === 'mentor');
  const meta = lastMentorMsg?.meta ?? {};
  const crisis = lastMentorMsg?.mode === 'HUMAN_SUPPORT' || meta.mode === 'HUMAN_SUPPORT';

  const q = meta.question;
  const teachingObj = s.principle ?? s.teaching ?? meta.teaching ?? null;

  const principle = teachingObj
    ? {
        quote: teachingObj.quote ?? teachingObj.exactText ?? teachingObj.text,
        title: teachingObj.title,
        work: teachingObj.work,
        section: teachingObj.section,
        sourceUrl: teachingObj.sourceUrl,
        source:
          teachingObj.sourceWork ??
          teachingObj.source ??
          teachingObj.citation ??
          (teachingObj.work ? `${teachingObj.work}${teachingObj.section ? ', ' + teachingObj.section : ''}` : null),
        verified: teachingObj.verified === true,
      }
    : null;

  const currentStage = s.stage ?? s.currentStage ?? '';
  const options = (q?.options ?? []).map(toText).filter((o) => o && (crisis || !isElse(o)));

  const latestAction = [...(s.actions ?? [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  return {
    id: pickId(raw),
    stage: currentStage,
    group: crisis ? 'support' : stageGroup(currentStage),
    thoughts,
    principle,
    teaching: principle,
    question: q
      ? {
          text: q.text ?? '',
          options,
          allowFreeText: q.allowFreeText !== false,
        }
      : null,
    options,
    explanation: meta.reflection?.explanation ?? '',
    suggestions: (meta.actions ?? []).map((a) => a.text).filter(Boolean),
    actionId: s.actionId ?? s.action?.id ?? s.action_id ?? latestAction?.id ?? null,
    actionText: latestAction?.actionText ?? '',
  };
}