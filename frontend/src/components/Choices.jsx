const CHOICES = [
  'I need more time.',
  'I know what I need to do.',
  'I want to take one small step.',
  "I'm still unsure.",
];

export default function Choices({ busy, onChoose }) {
  return (
    <div className="choices">
      <h2 className="choices__title">What feels right now?</h2>
      <ul>
        {CHOICES.map((c) => (
          <li key={c}>
            <button disabled={busy} onClick={() => onChoose(c)}>{c}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}