import { useEffect, useState } from 'react';
import Logo from './Logo.jsx';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 20);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <Logo href="#top" />
      <nav className="nav-links" aria-label="Main">
        <a href="#how">How it works</a>
        <a href="#retail">For retailers</a>
      </nav>
      <a className="btn btn-sm" href="/app">Open the app</a>
    </header>
  );
}
