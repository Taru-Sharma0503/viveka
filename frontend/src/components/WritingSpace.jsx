import { useEffect, useRef, useState } from 'react';

export default function WritingSpace({ label, placeholder = 'Write what comes to mind…', cta = 'Continue', busy, onSubmit }) {
  const [text, setText] = useState('');
  const ref = useRef(null);

  // grow with the writing
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const submit = () => {
    const t = text.trim();
    if (!t || busy) return;
    onSubmit(t);
    setText('');
  };

  return (
    <div className="writing">
      <label htmlFor="writing" className="writing__label">{label}</label>
      <textarea
        id="writing"
        ref={ref}
        rows={3}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(); }}
      />
      <button className="btn" onClick={submit} disabled={busy || !text.trim()}>
        {busy ? 'Listening…' : cta} <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}