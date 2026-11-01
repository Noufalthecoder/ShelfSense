import { useEffect } from 'react';
import Nav from './components/Nav.jsx';
import Story from './components/Story.jsx';
import Shelf3D from './components/Shelf3D.jsx';
import How from './components/How.jsx';
import Platform from './components/Platform.jsx';
import Retail from './components/Retail.jsx';
import Cta from './components/Cta.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  // gentle fade-in for the static sections
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: .2 });
    document.querySelectorAll('.fade').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <Nav />
      <main>
        <Story />
        <Shelf3D />
        <How />
        <Platform />
        <Retail />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
