// There is no "list sessions" route, so My Reflections is kept on this device only.
const KEY = 'viveka.reflections';

export const readArchive = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
};

const write = (list) => localStorage.setItem(KEY, JSON.stringify(list));

export function remember(entry) {
  const list = readArchive();
  const i = list.findIndex((e) => e.id === entry.id);
  if (i >= 0) list[i] = { ...list[i], ...entry };
  else list.unshift({ date: new Date().toISOString(), ...entry });
  write(list);
}

export const rememberAction = (actionId, text) => localStorage.setItem(`viveka.action.${actionId}`, text);
export const readAction = (actionId) => localStorage.getItem(`viveka.action.${actionId}`) || '';