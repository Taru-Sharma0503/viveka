import { useCallback, useState } from 'react';
import { createSession, getSession, sendMessage, createAction } from '../api/client.js';
import { normalize, pickId } from '../lib/adapt.js';
import { remember, rememberAction } from '../lib/archive.js';
import { topicFor } from '../lib/themes.js';

export function useReflection() {
  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      return await fn();
    } catch (e) {
      console.error(e);
      setError(`Something got in the way. (${e.message})`);
    } finally {
      setBusy(false);
    }
  };

  const refresh = async (id) => {
    const s = normalize({ ...(await getSession(id)), id });
    if (s.actionId && s.actionText) rememberAction(s.actionId, s.actionText);
    setSession(s);
    return s;
  };

  const load = useCallback((id) => run(() => refresh(id)), []);

  // Create the session with the topic only, then send the first thought as a
  // normal message so the mentor answers it (and it is not saved twice).
  const begin = (text, kind, theme) =>
    run(async () => {
      const created = await createSession(topicFor(theme), kind);
      const id = pickId(created);
      remember({ id, kind, theme, line: text });
      await sendMessage(id, text);
      await refresh(id);
      return id;
    });

  const reply = (text) =>
    run(async () => {
      await sendMessage(session.id, text);
      await refresh(session.id);
    });

  const commit = (description) =>
    run(async () => {
      const res = await createAction(session.id, description);
      const actionId = res?.actionId;
      if (actionId) rememberAction(actionId, description);
      remember({ id: session.id, line: description, actionId });
      await refresh(session.id);
      return actionId;
    });

  return { session, busy, error, load, begin, reply, commit };
}