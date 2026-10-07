import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import Home from './pages/Home.jsx';
import Reflect from './pages/Reflect.jsx';
import Review from './pages/Review.jsx';
import MyReflections from './pages/MyReflections.jsx';
import Teachings from './pages/Teachings.jsx';
import About from './pages/About.jsx';
import LotusIntro from './components/LotusIntro.jsx';
export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Nav />
      <LotusIntro />
      <div id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reflect" element={<Reflect />} />
          <Route path="/reflect/:sessionId" element={<Reflect />} />
          <Route path="/review/:actionId" element={<Review />} />
          <Route path="/my-reflections" element={<MyReflections />} />
          <Route path="/teachings" element={<Teachings />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </>
  );
}