const DEFAULT_CHOICES = [
  'I need more time.',
  'I know what I need to do.',
  'I want to take one small step.',
  "I'm still unsure.",
];

export default function Choices({ busy, onChoose, options, title }) {
  const items = Array.isArray(options) && options.length > 0 ? options : DEFAULT_CHOICES;

  return (
    <div className="choices">
      <h2 className="choices__title">{title || 'What feels right now?'}</h2>
      <ul>
        {items.map((c) => (
          <li key={c}>
            <button disabled={busy} onClick={() => onChoose(c)}>{c}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}