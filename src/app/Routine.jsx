import { useMemo, useState } from 'react';
import { buildRoutine, STEP_LABEL } from './routine.js';
import { evaluate, VERDICTS } from './ingredients.js';
import { DEMO_PRODUCTS } from './catalog.js';

const SUN = <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
const MOON = <svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>;

function ago(t) {
  const m = Math.round((Date.now() - t) / 6e4);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

export default function Routine({ bag, setBag, passport, history, setHistory, onOpen, onScan }) {
  const [time, setTime] = useState(() => (new Date().getHours() >= 15 ? 'pm' : 'am'));
  const routine = useMemo(() => buildRoutine(bag, passport), [bag, passport]);
  const steps = time === 'am' ? routine.am : routine.pm;
  const warnings = routine.warnings.filter((w) => w.when === (time === 'am' ? 'Morning' : 'Evening'));

  const addDemo = () => setBag((b) => {
    const have = new Set(b.map((x) => x.code));
    const extra = DEMO_PRODUCTS.filter((p) => p.kind === 'skincare' && !have.has(p.code))
      .map(({ code, name, color, kind, ingredients }) => ({ code, name, color, kind, ingredients }));
    return [...b, ...extra];
  });

  return (
    <div className="screen routine">
      <div>
        <p className="eyebrow">Your routine</p>
        <h1 className="screen-title">Morning &amp; evening</h1>
        <p className="muted small">Built from the skincare in your bag, in the right order, with clashes caught for you.</p>
      </div>

      {routine.count === 0 ? (
        <div className="soft-card empty-card">
          <div className="empty-art" aria-hidden="true">{SUN}{MOON}</div>
          <p><b>No skincare in your bag yet.</b></p>
          <p className="muted small">Scan products and add the ones that suit you. ShelfSense puts them in order and checks they play well together.</p>
          <div className="stack">
            <button className="btn btn-block" onClick={onScan}>Scan a product</button>
            <button className="btn btn-light btn-block" onClick={addDemo}>Try it with demo products</button>
          </div>
        </div>
      ) : (
        <>
          <div className="seg" role="tablist" aria-label="Time of day">
            <button role="tab" aria-selected={time === 'am'} className={time === 'am' ? 'on' : ''} onClick={() => setTime('am')}>{SUN}Morning<small>{routine.am.length}</small></button>
            <button role="tab" aria-selected={time === 'pm'} className={time === 'pm' ? 'on' : ''} onClick={() => setTime('pm')}>{MOON}Evening<small>{routine.pm.length}</small></button>
            <i className={`seg-thumb ${time}`} aria-hidden="true" />
          </div>

          {warnings.map((w) => (
            <div key={w.text} className="callout warn">
              <b>Clash · {w.products.join(' + ')}</b>
              <span>{w.text}</span>
            </div>
          ))}

          {steps.length ? (
            <ol className="steps" key={time}>
              {steps.map((it, i) => {
                const v = VERDICTS[it.r.verdict];
                return (
                  <li key={it.product.code} style={{ animationDelay: `${i * 60}ms` }}>
                    <span className="step-n">{i + 1}</span>
                    <button className="step-card" onClick={() => onOpen(it.product)}>
                      <span className="swatch" style={{ background: it.product.color ?? '#eee6de' }} />
                      <span className="step-body">
                        <small>{STEP_LABEL[it.step]}</small>
                        <b>{it.product.name}</b>
                        {it.actives.length > 0 && <span className="step-actives">{it.actives.slice(0, 3).join(' · ')}</span>}
                      </span>
                      <span className={`pill ${v.tone}`}>{v.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="muted small center">Nothing for the {time === 'am' ? 'morning' : 'evening'} yet.</p>
          )}

          {routine.notes.map((n) => (
            <div key={n.text} className={`callout ${n.tone}`}><span>{n.text}</span></div>
          ))}
        </>
      )}

      <div className="section-row">
        <h2 className="sub-title">Recently scanned</h2>
        {history.length > 0 && <button className="link-btn small" onClick={() => setHistory([])}>Clear</button>}
      </div>
      {history.length ? (
        <ul className="history">
          {history.map(({ product, at }) => {
            const r = evaluate(product, passport);
            const v = VERDICTS[r.verdict];
            return (
              <li key={product.code}>
                <button onClick={() => onOpen(product)}>
                  <span className="swatch" style={{ background: product.color ?? '#eee6de' }} />
                  <span className="history-body"><b>{product.name}</b><small>{ago(at)}</small></span>
                  {r.score != null && <span className={`history-score ${v.tone}`}>{r.score}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted small">Products you look at will show up here, so you can find them again.</p>
      )}
    </div>
  );
}
