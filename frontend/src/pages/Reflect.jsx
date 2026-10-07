import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useReflection } from '../hooks/useReflection.js';
import WritingSpace from '../components/WritingSpace.jsx';
import Choices from '../components/Choices.jsx';
import TeachingBlock from '../components/TeachingBlock.jsx';
import Themes from '../components/Themes.jsx';
import { themeLabel } from '../lib/themes.js';

const KINDS = {
  trouble: { label: 'Trouble', prompt: 'What is on your mind?' },
  clarity: { label: 'Clarity', prompt: 'What do you need to see more clearly?' },
  teaching: { label: 'Teaching', prompt: 'Which teaching, or which question, are you carrying?' },
};

export default function Reflect() {
  const { sessionId } = useParams();
  const [params] = useSearchParams();
  const kind = KINDS[params.get('kind')] ? params.get('kind') : 'trouble';

  const needsTheme = kind !== 'teaching';
  const theme = needsTheme && themeLabel(params.get('theme')) ? params.get('theme') : null;
  const tag = themeLabel(theme) || KINDS[kind].label;

  const navigate = useNavigate();
  const { session, busy, error, load, begin, reply, commit } = useReflection();
  const [done, setDone] = useState(null);

  useEffect(() => { if (sessionId) load(sessionId); }, [sessionId, load]);

  const pickTheme = (slug) => navigate(`/reflect?kind=${kind}&theme=${slug}`);

  const start = async (text) => {
    const id = await begin(text, kind, theme);
    const q = `kind=${kind}${theme ? `&theme=${theme}` : ''}`;
    if (id) navigate(`/reflect/${id}?${q}`, { replace: true });
  };

  /* ---------- Step 0: what is this about? ---------- */
  if (!sessionId && !theme && needsTheme) {
    return (
      <main className="reflect" data-group="begin">
        <div className="reflect__inner">
          <p className="label">Reflection · {KINDS[kind].label}</p>
          <h1 className="focus">What is this closest to?</h1>
          <p className="hint">Choose the nearest one. You can say more in a moment.</p>
          <Themes onPick={pickTheme} />
        </div>
      </main>
    );
  }

  /* ---------- Before anything is said ---------- */
  if (!sessionId) {
    return (
      <main className="reflect" data-group="begin">
        <div className="reflect__inner">
          <p className="label">Reflection · {tag}</p>
          <h1 className="focus">{KINDS[kind].prompt}</h1>
          <p className="hint">Take your time. There is no right way to begin.</p>
          <WritingSpace label="Your thought" cta="Begin" busy={busy} onSubmit={start} />
          {needsTheme && (
            <p className="closing"><Link to={`/reflect?kind=${kind}`}>← Choose a different theme</Link></p>
          )}
          {error && <p role="alert" className="error">{error}</p>}
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="reflect">
        <div className="reflect__inner">
          <p className="hint" aria-live="polite">{error || 'Gathering your thoughts…'}</p>
        </div>
      </main>
    );
  }

  /* ---------- A sequence of thoughts ---------- */
  const { thoughts, group, principle, actionId, options } = session;
  const lastMentorIndex = [...thoughts].map((t) => t.role).lastIndexOf('mentor');
  const current = lastMentorIndex >= 0 ? thoughts[lastMentorIndex] : null;
  const past = thoughts.filter((_, i) => i !== lastMentorIndex);
  const paragraphs = (current?.text || '').split(/\n+/).filter(Boolean);
  const reviewId = done || actionId;

  return (
    <main className="reflect" data-group={group}>
      <div className="reflect__inner">
        <p className="label">Reflection · {tag}</p>

        <ol className="past" aria-label="Earlier in this reflection">
          {past.map((t, i) => (
            <li key={i} className={t.role === 'user' ? 'past__you' : 'past__mentor'}>{t.text}</li>
          ))}
        </ol>

        {group === 'insight' && (
          <p className="insight"><span className="insight__mark" aria-hidden="true" />Something became clearer.</p>
        )}

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

        {/* options the mentor offered, if any */}
        {group !== 'action' && group !== 'review' && (
          <Choices options={options} busy={busy} onChoose={reply} />
        )}

        {group === 'action' && !reviewId && (
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

        {reviewId && (
          <p className="closing">
            Noted. Go and try it.{' '}
            <Link to={`/review/${reviewId}`}>When you're ready, come back and look at it →</Link>
          </p>
        )}

        {/* keep writing: after a mentor message, or beside the options as "your own answer" */}
        {['understand', 'insight', 'principle', 'support', 'choice'].includes(group) && (
          <WritingSpace
            label={options?.length ? 'Or write your own' : 'Your thought'}
            busy={busy}
            onSubmit={reply}
          />
        )}

        {group === 'review' && !reviewId && (
          <WritingSpace label="Your thought" busy={busy} onSubmit={reply} />
        )}

        {error && <p role="alert" className="error">{error}</p>}
      </div>
    </main>
  );
}