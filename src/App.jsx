import { useState } from 'react';
import Home from './Home.jsx';
import Preloader from './preloader/Preloader.jsx';

export default function App() {
  const [preloaded, setPreloaded] = useState(false);

  return (
    <>
      {/* Home is mounted underneath from the start: the preloader reveals the real page. */}
      <Home inert={!preloaded} />
      {!preloaded && <Preloader onComplete={() => setPreloaded(true)} />}
    </>
  );
}
