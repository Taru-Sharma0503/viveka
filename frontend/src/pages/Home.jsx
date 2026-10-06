import { Link } from 'react-router-dom';
import ReflectionVisual from '../components/ReflectionVisual.jsx';

const DOORS = [
  { kind: 'trouble', n: '01', text: 'Something is troubling me' },
  { kind: 'clarity', n: '02', text: 'I need clarity' },
  { kind: 'teaching', n: '03', text: 'I want to explore a teaching' },
];

export default function Home() {
  return (
    <main className="home">
      <section className="home__text">
        <h1 className="statement">
          Some things don't need an answer yet.
          <em>They need to be understood.</em>
        </h1>

        <p className="home__name">VIVEKA</p>
        <p className="lede">A reflective mentor inspired by the documented teachings of Swami Vivekananda.</p>

        <ul className="doors" aria-label="Begin a reflection">
          {DOORS.map((d) => (
            <li key={d.kind}>
              <Link to={`/reflect?kind=${d.kind}`}>
                <span className="doors__n">{d.n}</span>
                <span className="doors__t">{d.text}</span>
                <span className="doors__a" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="home__note">VIVEKA is an AI. It is not Swami Vivekananda, and its words are not his.</p>
      </section>

      <div className="home__visual">
        <ReflectionVisual />
      </div>
    </main>
  );
}