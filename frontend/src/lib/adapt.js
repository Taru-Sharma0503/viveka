// UNDERSTAND/CLARIFY/ROOT_CONCERN → a question; TEACHING → the documented teaching;
// REFLECT → what it may mean (the quiet "something became clearer" moment); ACTION; REVIEW.
export function stageGroup(stage = '') {
  switch (String(stage).toUpperCase()) {
    case 'REVIEW': return 'review';
    case 'ACTION': return 'action';
    case 'TEACHING': return 'principle';
    case 'REFLECT': return 'insight';
    default: return 'understand';
  }
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

  // what the mentor produced last (question, teaching, reflection, actions) lives in its metadata
  const lastMentor = [...thoughts].reverse().find((t) => t.role === 'mentor');
  const meta = lastMentor?.meta ?? {};
  const crisis = lastMentor?.mode === 'HUMAN_SUPPORT' || meta.mode === 'HUMAN_SUPPORT';

  const q = meta.question;
  const t = meta.teaching;

  const latestAction = [...(s.actions ?? [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  return {
    id: pickId(s),
    stage: s.currentStage,
    group: crisis ? 'support' : stageGroup(s.currentStage),
    thoughts,
    question: q
      ? {
          text: q.text ?? '',
          options: (q.options ?? []).map(toText).filter((o) => o && (crisis || !isElse(o))),
          allowFreeText: q.allowFreeText !== false,
        }
      : null,
        teaching: t
      ? {
          quote: t.quote,
          title: t.title,
          work: t.work,
          section: t.section,
          sourceUrl: t.sourceUrl,
          verified: t.verified === true,
        }
      : null,
    explanation: meta.reflection?.explanation ?? '',
    suggestions: (meta.actions ?? []).map((a) => a.text).filter(Boolean),
    actionId: latestAction?.id ?? null,
    actionText: latestAction?.actionText ?? '',
  };
}