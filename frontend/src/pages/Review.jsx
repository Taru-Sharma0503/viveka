import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { reviewAction } from '../api/client.js';
import { readAction } from '../lib/archive.js';

export default function Review() {
  const { actionId } = useParams();
  const step = readAction(actionId);
  const [v, setV] = useState({ understood: '', chose: '', learned: '' });
  const [state, setState] = useState('idle'); // idle | busy | done | error

  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const submit = async () => {
    setState('busy');
    try { await reviewAction(actionId, v); setState('done'); }
    catch { setState('error'); }
  };

  if (state === 'done') {
    return (
      <main className="reflect" data-group="review">
        <div className="reflect__inner">
          <p className="insight"><span className="insight__mark" aria-hidden="true" />Something became clearer.</p>
          <p className="focus">Thank you for looking back honestly.</p>
          <p className="closing"><Link to="/my-reflections">See your reflections →</Link></p>
        </div>
      </main>
    );
  }

  return (
    <main className="reflect" data-group="review">
      <div className="reflect__inner">
        <p className="label">Looking back</p>
        <h1 className="focus focus--soft">You chose this earlier.</h1>
        {step && <blockquote className="yourstep">{step}</blockquote>}
        <h2 className="focus">What did you discover?</h2>

        {[
          ['understood', 'What I understood'],
          ['chose', 'What I chose'],
          ['learned', 'What I learned'],
        ].map(([k, label]) => (
          <div className="writing" key={k}>
            <label htmlFor={k} className="writing__label">{label}</label>
            <textarea id={k} rows={2} value={v[k]} onChange={set(k)} placeholder="…" />
          </div>
        ))}

        <button className="btn" onClick={submit} disabled={state === 'busy'}>Save this <span aria-hidden="true">→</span></button>
        {state === 'error' && <p role="alert" className="error">That did not save. Please try again.</p>}
      </div>
    </main>
  );
}