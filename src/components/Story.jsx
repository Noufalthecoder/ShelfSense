import { useEffect, useRef, useState } from 'react';
import Bottle, { SCAN_START, SCAN_END, PROOF_START } from './Bottle.jsx';
import Portrait from './Portrait.jsx';
import Proof from './Proof.jsx';

const INGREDIENTS = [
  ['Niacinamide', 'Targets your dark spots'],
  ['Zinc PCA', 'Balances your oily T-zone'],
  ['Panthenol', 'Calms, keeps redness low'],
  ['Fragrance', 'None found'],
];
const STEPS = ['Your skin', 'The label', 'The verdict', 'The proof'];
const RESULTS = [
  ['Dark spots', '↓ 18%', 'good'],
  ['Oiliness', '↓ 9%', 'good'],
  ['Redness', 'No change', 'flat'],
];

export default function Story() {
  const section = useRef(null);
  const progress = useRef(0);
  const active = useRef(true);
  const [phase, setPhase] = useState(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const r = section.current.getBoundingClientRect();
      const p = Math.min(Math.max(-r.top / (r.height - innerHeight), 0), 1);
      progress.current = p;
      setPhase(p < SCAN_START ? 0 : p < SCAN_END ? 1 : p < PROOF_START ? 2 : 3);
      const local = (p - SCAN_START) / (SCAN_END - SCAN_START);
      setShown(INGREDIENTS.filter((_, i) => local > .08 + i * .2).length);
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);

    // only render the 3D scene while the story is on screen
    const io = new IntersectionObserver(([en]) => { active.current = en.isIntersecting; });
    io.observe(section.current);

    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <section className="story" ref={section} id="top">
      <div className="sticky">
        <div className="copy">
          <div className={`panel ${phase === 0 ? 'on' : ''}`} aria-hidden={phase !== 0}>
            <p className="eyebrow">AI skin lens for every shelf</p>
            <h1>Know if it suits you, <em>before</em> you buy it.</h1>
            <p className="lede">Scan any beauty product in any store. ShelfSense reads the label against your own skin scan and tells you, in seconds, whether it's right for you.</p>
            <div className="actions">
              <a className="btn" href="/app">Get my Skin Passport</a>
              <a className="btn btn-light" href="#how">How it works</a>
            </div>
            <div className="passport">
              <p className="passport-label">Your Skin Passport</p>
              <ul className="chips">
                <li>Oily T-zone</li>
                <li>Dark spots</li>
                <li>Low redness</li>
                <li>Warm undertone</li>
              </ul>
            </div>
          </div>

          <div className={`panel ${phase === 1 ? 'on' : ''}`} aria-hidden={phase !== 1}>
            <p className="eyebrow">Reading the label</p>
            <h2>Every ingredient, checked against <em>your</em> skin.</h2>
            <ul className="ingredients">
              {INGREDIENTS.map(([name, note], i) => (
                <li key={name} className={i < shown ? 'shown' : ''}>
                  <i className="check" aria-hidden="true">✓</i><b>{name}</b><span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`panel ${phase === 2 ? 'on' : ''}`} aria-hidden={phase !== 2}>
            <div className="verdict">
              <div className="verdict-head">
                <span className="verdict-badge"><i />Suits you</span>
                <span className="score">94<small> / 100</small></span>
              </div>
              <h3>Serum Nº 10, Niacinamide 10%</h3>
              <ul>
                <li>Niacinamide targets the dark spots in your scan</li>
                <li>Light and oil-free, right for your T-zone</li>
                <li>Fragrance-free, so your redness stays low</li>
              </ul>
              <div className="actions">
                <a className="btn" href="#cta">Add to bag</a>
                <a className="btn btn-light" href="#how">See it on me</a>
              </div>
            </div>
          </div>

          <div className={`panel ${phase === 3 ? 'on' : ''}`} aria-hidden={phase !== 3}>
            <p className="eyebrow">Track the proof</p>
            <h2>Don't just trust it. <em>Watch it work.</em></h2>
            <p className="lede">Start a 30-day trial and take a quick selfie each week. YouCam AI re-scans your skin, so you see whether the product is really doing its job.</p>
            <ul className="results">
              {RESULTS.map(([name, change, tone]) => (
                <li key={name}><span>{name}</span><b className={tone}>{change}</b></li>
              ))}
            </ul>
            <p className="note">Example 30-day trial, for illustration.</p>
          </div>
        </div>

        <div className="visual" data-phase={phase}>
          <div className="layer layer-face"><Portrait /></div>
          <div className="layer layer-bottle"><Bottle progress={progress} active={active} /></div>
          <div className="layer layer-proof"><Proof /></div>
        </div>

        <ol className="steps-nav" aria-hidden="true">
          {STEPS.map((s, i) => <li key={s} className={i === phase ? 'on' : ''}>{s}</li>)}
        </ol>
      </div>
    </section>
  );
}
