import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useReflection } from '../hooks/useReflection.js';
import WritingSpace from '../components/WritingSpace.jsx';
import Choices from '../components/Choices.jsx';
import TeachingBlock from '../components/TeachingBlock.jsx';

const KINDS = {
  trouble: { label: 'Trouble', prompt: 'What is on your mind?' },
  clarity: { label: 'Clarity', prompt: 'What do you need to see more clearly?' },
  teaching: { label: 'Teaching', prompt: 'Which teaching, or which question, are you carrying?' },
};

export default function Reflect() {
  const { sessionId } = useParams();
  const [params] = useSearchParams();
  const kind = KINDS[params.get('kind')] ? params.get('kind') : 'trouble';
  const navigate = useNavigate();
  const { session, busy, error, load, begin, reply, commit } = useReflection();
  const [done, setDone] = useState(null); // actionId after committing

  useEffect(() => { if (sessionId) load(sessionId); }, [sessionId, load]);

  const start = async (text) => {
    const id = await begin(text, kind);
    if (id) navigate(`/reflect/${id}?kind=${kind}`, { replace: true });
  };

  /* ---------- Before anything is said ---------- */
  if (!sessionId) {
    return (
      <main className="reflect" data-group="begin">
        <div className="reflect__inner">
          <p className="label">Reflection · {KINDS[kind].label}</p>
          <h1 className="focus">{KINDS[kind].prompt}</h1>
          <p className="hint">Take your time. There is no right way to begin.</p>
          <WritingSpace label="Your thought" cta="Begin" busy={busy} onSubmit={start} />
          {error && <p role="alert" className="error">{error}</p>}
        </div>
      </main>
    );
  }

  if (!session) {
    return <main className="reflect"><div className="reflect__inner"><p className="hint" aria-live="polite">{error || 'Gathering your thoughts…'}</p></div></main>;
  }

  /* ---------- A sequence of thoughts ---------- */
  const { thoughts, group, principle, actionId } = session;
  const lastMentorIndex = [...thoughts].map((t) => t.role).lastIndexOf('mentor');
  const current = lastMentorIndex >= 0 ? thoughts[lastMentorIndex] : null;
  const past = thoughts.filter((_, i) => i !== lastMentorIndex);
  const paragraphs = (current?.text || '').split(/\n+/).filter(Boolean);

  return (
    <main className="reflect" data-group={group}>
      <div className="reflect__inner">
        <p className="label">Reflection · {KINDS[kind].label}</p>

        {/* what came before recedes */}
        <ol className="past" aria-label="Earlier in this reflection">
          {past.map((t, i) => (
            <li key={i} className={t.role === 'user' ? 'past__you' : 'past__mentor'}>{t.text}</li>
          ))}
        </ol>

        {group === 'insight' && (
          <p className="insight"><span className="insight__mark" aria-hidden="true" />Something became clearer.</p>
        )}

        {/* the one thing in focus */}
        {current && group === 'principle' && principle?.quote ? (
          <TeachingBlock principle={principle} interpretation={current.text} />
        ) : (
          current && (
            <div className="focus-block" key={current.text} aria-live="polite">
              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={p.trim().endsWith('?') ? 'focus' : 'focus focus--soft'}
                  style={{ animationDelay: `${i * 0.9}s` }}
                >
                  {p}
                </p>
              ))}
            </div>
          )
        )}

        {/* what you can do next depends on where you are */}
        {group === 'choice' && (
          <Choices busy={busy} onChoose={reply} options={session.question?.options} title={session.question?.text} />
        )}

        {group === 'action' && !done && !actionId && (
          <div className="action">
            <h2 className="action__title">One small step.</h2>
            <WritingSpace
              label="What is one thing you can do today?"
              placeholder="Something small, and yours."
              cta="I'll take this step"
              busy={busy}
              onSubmit={async (t) => { const id = await commit(t); if (id) setDone(id); }}
            />
          </div>
        )}

        {(done || actionId) && (
          <p className="closing">
            Noted. Go and try it.{' '}
            <Link to={`/review/${done || actionId}`}>When you're ready, come back and look at it →</Link>
          </p>
        )}

        {['understand', 'insight', 'principle'].includes(group) && (
          <WritingSpace label="Your thought" busy={busy} onSubmit={reply} />
        )}

        {group === 'review' && !(done || actionId) && (
          <WritingSpace label="Your thought" busy={busy} onSubmit={reply} />
        )}

        {error && <p role="alert" className="error">{error}</p>}
      </div>
    </main>
  );
}