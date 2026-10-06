export const THEMES = [
  { slug: 'failure', label: 'Failure', topic: 'FAILURE' },
  { slug: 'fear', label: 'Fear', topic: 'FEAR' },
  { slug: 'anger', label: 'Anger', topic: 'ANGER' },
  { slug: 'purpose', label: 'Purpose', topic: 'PURPOSE' },
  { slug: 'relationships', label: 'Relationships', topic: 'RELATIONSHIPS' },
  { slug: 'work', label: 'Work', topic: 'WORK' },
  { slug: 'grief', label: 'Grief', topic: 'GRIEF' },
  { slug: 'general', label: 'Something else', topic: 'GENERAL' },
];

export const themeLabel = (slug) => THEMES.find((t) => t.slug === slug)?.label;

// "Explore a teaching" has no theme step, so it is sent as GENERAL.
export const topicFor = (slug) => THEMES.find((t) => t.slug === slug)?.topic ?? 'GENERAL';