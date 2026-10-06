import { Link } from 'react-router-dom';
import { readArchive } from '../lib/archive.js';
import { themeLabel } from '../lib/themes.js';

const fmt = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();

export default function MyReflections() {
  const items = readArchive();

  return (
    <main className="page">
      <h1 className="page__title">My Reflections</h1>
      {items.length === 0 ? (
        <p className="page__quiet">Nothing here yet. When you've reflected on something, it will rest here.</p>
      ) : (
        <ol className="archive">
          {items.map((e) => {
            const tag = themeLabel(e.theme) || e.kind || 'reflection';
            const q = `kind=${e.kind || 'trouble'}${e.theme ? `&theme=${e.theme}` : ''}`;
            return (
              <li key={e.id}>
                <Link to={`/reflect/${e.id}?${q}`}>
                  <span className="label">{fmt(e.date)} · {tag.toUpperCase()}</span>
                  <span className="archive__line">“{e.line}”</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}