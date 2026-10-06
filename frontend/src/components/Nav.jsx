import { NavLink, Link } from 'react-router-dom';

export default function Nav() {
  return (
    <header className="nav">
      <Link to="/" className="nav__mark" aria-label="VIVEKA home">VIVEKA</Link>
      <nav aria-label="Main">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/my-reflections">My Reflections</NavLink>
        <NavLink to="/teachings">Teachings</NavLink>
        <NavLink to="/about">About</NavLink>
      </nav>
    </header>
  );
}