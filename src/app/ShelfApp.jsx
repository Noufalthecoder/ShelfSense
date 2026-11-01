import { useEffect, useState } from 'react';
import { getStatus } from './api.js';
import Logo from '../components/Logo.jsx';
import Passport from './Passport.jsx';
import Scanner from './Scanner.jsx';
import Trials, { newTrial } from './Trials.jsx';
import VerdictSheet from './VerdictSheet.jsx';
import DemoCodes from './DemoCodes.jsx';
import { evaluate, VERDICTS } from './ingredients.js';
import { useStored } from './store.js';
import './app.css';

const TABS = [
  ['passport', 'Skin', <svg key="i" viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" /><path d="M5 20c1.2-3.5 3.8-5 7-5s5.8 1.5 7 5" /></svg>],
  ['scan', 'Scan', <svg key="i" viewBox="0 0 24 24"><path d="M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3M8 8v8M11 8v8M13 8v8M16 8v8" /></svg>],
  ['trials', 'Trials', <svg key="i" viewBox="0 0 24 24"><path d="M4 4v16h16" /><path d="M7 14l4-4 3 3 5-6" /></svg>],
];

export default function ShelfApp() {
  const [tab, setTab] = useState(() => {
    const h = location.hash.slice(1);
    return TABS.some(([k]) => k === h) ? h : 'passport';
  });
  const [passport, setPassport] = useStored('ss.passport', null);
  const [selfie, setSelfie] = useStored('ss.selfie', null);
  const [trials, setTrials] = useStored('ss.trials', []);
  const [bag, setBag] = useStored('ss.bag', []);
  const [open, setOpen] = useState(null);
  const [codes, setCodes] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [demo, setDemo] = useState(false);

  // re-check the balance whenever the tab changes, e.g. after a scan used credits
  useEffect(() => {
    getStatus().then((s) => setDemo(Boolean(s.demo)));
  }, [tab, passport]);

  const go = (t) => {
    setTab(t);
    setOpen(null);
    history.replaceState(null, '', `#${t}`);
  };

  const addToBag = (p) => setBag((b) => (b.some((x) => x.code === p.code)
    ? b
    : [...b, { code: p.code, name: p.name, color: p.color, kind: p.kind, ingredients: p.ingredients }]));

  const startTrial = (product) => {
    const { targets } = evaluate(product, passport);
    setTrials((ts) => [newTrial(product, targets, passport), ...ts]);
    go('trials');
  };

  return (
    <div className="ss-app">
      <header className="ss-header">
        <Logo href="/" size={26} />
        {demo && <span className="demo-pill" title="YouCam credits are used up. Skin scores are simulated; earlier results still load from cache.">Demo mode</span>}
        <button className="bag-btn" onClick={() => setBagOpen(true)} aria-label={`Bag, ${bag.length} items`}>
          <svg viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7z" /><path d="M9 8a3 3 0 0 1 6 0" /></svg>
          {bag.length > 0 && <b>{bag.length}</b>}
        </button>
      </header>

      <main className={`ss-main ${tab === 'scan' ? 'full' : ''}`}>
        {tab === 'passport' && <Passport passport={passport} setPassport={setPassport} setSelfie={setSelfie} onScan={() => go('scan')} />}
        {tab === 'scan' && <Scanner passport={passport} onOpen={setOpen} onAddToBag={addToBag} onNeedPassport={() => go('passport')} onShowCodes={() => setCodes(true)} />}
        {tab === 'trials' && <Trials trials={trials} setTrials={setTrials} onScan={() => go('scan')} />}
      </main>

      <nav className="ss-tabs" aria-label="App sections">
        {TABS.map(([key, label, icon]) => (
          <button key={key} className={tab === key ? 'on' : ''} onClick={() => go(key)} aria-current={tab === key ? 'page' : undefined}>
            {icon}<span>{label}</span>
          </button>
        ))}
      </nav>

      {open && (
        <VerdictSheet
          product={open}
          passport={passport}
          selfie={selfie}
          inBag={bag.some((b) => b.code === open.code)}
          hasTrial={trials.some((t) => !t.example && t.product.code === open.code)}
          onAddToBag={() => addToBag(open)}
          onStartTrial={() => startTrial(open)}
          onNeedPassport={() => go('passport')}
          onClose={() => setOpen(null)}
        />
      )}

      {codes && <DemoCodes onClose={() => setCodes(false)} />}

      {bagOpen && (
        <div className="sheet-backdrop" onClick={() => setBagOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Your bag" onClick={(e) => e.stopPropagation()}>
            <button className="sheet-close" onClick={() => setBagOpen(false)} aria-label="Close">×</button>
            <h2 className="sheet-title">Your bag</h2>
            {!bag.length && <p className="muted">Nothing here yet. Scan a product and add it.</p>}
            <ul className="bag-list">
              {bag.map((item) => {
                const v = VERDICTS[evaluate(item, passport).verdict];
                return (
                  <li key={item.code}>
                    <span className="swatch" style={{ background: item.color ?? '#e6ded5' }} />
                    <span className="bag-name">{item.name}<small className={v.tone}>{v.label}</small></span>
                    <button className="link-btn small" onClick={() => setBag((b) => b.filter((x) => x.code !== item.code))}>Remove</button>
                  </li>
                );
              })}
            </ul>
            {bag.length > 0 && <p className="fineprint">Prototype bag: checkout would hand off to the retailer.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
