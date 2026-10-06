import { Link } from 'react-router-dom';
import { readArchive } from '../lib/archive.js';

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
          {items.map((e) => (
            <li key={e.id}>
              <Link to={`/reflect/${e.id}?kind=${e.kind || 'trouble'}`}>
                <span className="label">{fmt(e.date)} · {(e.kind || 'reflection').toUpperCase()}</span>
                <span className="archive__line">“{e.line}”</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}