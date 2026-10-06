import { THEMES } from '../lib/themes.js';

export default function Themes({ onPick }) {
  return (
    <div className="themes">
      <ul>
        {THEMES.map((t, i) => (
          <li key={t.slug}>
            <button onClick={() => onPick(t.slug)}>
              <span className="themes__n">{String(i + 1).padStart(2, '0')}</span>
              <span className="themes__t">{t.label}</span>
              <span className="themes__a" aria-hidden="true">→</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}