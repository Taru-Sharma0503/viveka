import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { reviewAction } from '../api/client.js';
import { readAction } from '../lib/archive.js';

// ← MATCH these three values to the status values your backend accepts
const STATUSES = [
  { value: 'COMPLETED', label: 'Yes, I did it.' },
  { value: 'PARTIALLY_COMPLETED', label: 'Partly.' },
  { value: 'PENDING', label: 'Not yet.' },
];

export default function Review() {
  const { actionId } = useParams();
  const step = readAction(actionId);

  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(null);
  const [state, setState] = useState('idle'); // idle | busy | done | error
  const [nextStep, setNextStep] = useState('');
  const [message, setMessage] = useState('');

  const submit = async () => {
    setState('busy');
    try {
      const res = await reviewAction(actionId, {
        status,
        note: note.trim() || null,
        helpfulnessRating: rating,
      });
      setNextStep(res?.nextStep?.text || '');
      setState('done');
    } catch (e) {
      console.error(e);
      setMessage(e.message);
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <main className="reflect" data-group="review">
        <div className="reflect__inner">
          <p className="insight"><span className="insight__mark" aria-hidden="true" />Something became clearer.</p>
          {nextStep && <p className="focus">{nextStep}</p>}
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

        <div className="choices">
          <h2 className="choices__title">Did you try it?</h2>
          <ul>
            {STATUSES.map((s) => (
                <li key={s.value}>
                <button
                    type="button"
                    aria-pressed={status === s.value}
                    onClick={() => setStatus(s.value)}
                >
                    <span>{s.label}</span>
                    {status === s.value && <span className="choice-check">✓</span>}
                </button>
            </li>
        ))}
          </ul>
        </div>

        <div className="writing">
          <label htmlFor="note" className="writing__label">What did you discover?</label>
          <textarea
            id="note" rows={3} value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What I understood, what I chose, what I learned…"
          />
        </div>

        <div className="writing">
          <p className="writing__label" id="rate">How useful was this reflection? (optional)</p>
          <div className="rating" role="group" aria-labelledby="rate">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} aria-pressed={rating === n} onClick={() => setRating(rating === n ? null : n)}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <button className="btn" style={{ marginTop: '2rem' }} onClick={submit} disabled={!status || state === 'busy'}>
          Save this <span aria-hidden="true">→</span>
        </button>
        {state === 'error' && <p role="alert" className="error">That did not save. ({message})</p>}
      </div>
    </main>
  );
}