import { useCallback, useState } from 'react';
import { createSession, getSession, sendMessage, createAction } from '../api/client.js';
import { normalize, pickId } from '../lib/adapt.js';
import { remember, rememberAction } from '../lib/archive.js';

export function useReflection() {
  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try { return await fn(); }
    catch { setError('Something got in the way. Take a breath and try again.'); }
    finally { setBusy(false); }
  };

  const refresh = async (id) => {
    const s = normalize({ ...(await getSession(id)), id });
    setSession(s);
    return s;
  };

  const load = useCallback((id) => run(() => refresh(id)), []);

  const begin = (text, kind) =>
    run(async () => {
      const created = await createSession(text, kind);
      const id = pickId(created);
      remember({ id, kind, line: text });
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
      const actionId = res?.id ?? res?.actionId ?? res?.action?.id;
      if (actionId) rememberAction(actionId, description);
      remember({ id: session.id, line: description, actionId });
      await refresh(session.id);
      return actionId;
    });

  return { session, busy, error, load, begin, reply, commit };
}