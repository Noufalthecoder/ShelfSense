import { useEffect, useMemo, useState } from 'react';
import { evaluate, ingredientInsight, VERDICTS } from './ingredients.js';
import { vtoEffects } from './catalog.js';
import { tryOn } from './api.js';

function TryOn({ selfie, effects, shade, onNeedPassport }) {
  const [state, setState] = useState('idle');
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);
  const [noCredits, setNoCredits] = useState(false);
  const [before, setBefore] = useState(false);

  if (!selfie) {
    return (
      <div className="tryon">
        <p className="muted small">Take your selfie to see this exact shade on your face.</p>
        <button className="btn btn-light btn-sm" onClick={onNeedPassport}>Take my selfie</button>
      </div>
    );
  }

  const run = async () => {
    setState('loading');
    setError(null);
    try {
      const r = await tryOn(selfie, effects);
      setImage(r.image);
      setState('done');
    } catch (e) {
      setError(e.message);
      setNoCredits(e.code === 'no_credits');
      setState('idle');
    }
  };

  if (noCredits) {
    return (
      <div className="tryon tryon-fallback">
        <span className="shade-dot" style={{ background: shade }} />
        <p className="small muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="tryon">
      {state === 'done' ? (
        <figure
          className="tryon-result"
          onPointerDown={() => setBefore(true)}
          onPointerUp={() => setBefore(false)}
          onPointerLeave={() => setBefore(false)}
        >
          <img src={before ? selfie : image} alt={before ? 'Your selfie' : 'You wearing this shade'} />
          <figcaption>{before ? 'Before' : 'Hold to compare'}</figcaption>
        </figure>
      ) : (
        <button className="btn btn-block" disabled={state === 'loading'} onClick={run}>
          {state === 'loading' ? 'Rendering it on your face…' : 'See it on me'}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

// the label, ingredient by ingredient; known ones are coloured for this skin and explain themselves on tap
function IngredientChips({ text, passport, source }) {
  const [pick, setPick] = useState(null);
  const list = useMemo(() => (text || '').split(/,(?![^(]*\))/).map((x) => x.trim()).filter(Boolean)
    .map((raw) => ({ raw, info: ingredientInsight(raw, passport) })), [text, passport]);
  if (!list.length) return null;
  const known = list.filter((x) => x.info).length;
  const sel = pick != null ? list[pick] : null;
  return (
    <div className="ing">
      <div className="section-row">
        <h3 className="sub-title sm">Ingredients, read for you</h3>
        <span className="small muted">{known} of {list.length} explained</span>
      </div>
      <ul className="ing-chips">
        {list.map((x, i) => (
          <li key={`${x.raw}-${i}`}>
            <button
              className={`${x.info ? x.info.tone : 'plain'} ${pick === i ? 'on' : ''}`}
              disabled={!x.info}
              onClick={() => setPick(pick === i ? null : i)}
            >{x.raw}</button>
          </li>
        ))}
      </ul>
      {sel && (
        <div className={`ing-info ${sel.info.tone}`} key={pick}>
          <b>{sel.info.name}</b>
          {sel.info.helps.length > 0 && <span>Helps: {sel.info.helps.join(', ')}.</span>}
          {sel.info.hurts.length > 0 && <span>Watch out: {sel.info.note ?? `may aggravate ${sel.info.hurts.join(', ')}`}.</span>}
        </div>
      )}
      {source && <p className="fineprint">Source: {source}</p>}
    </div>
  );
}

const SPEAK = <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>;
const STOP = <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
const SHARE = <svg viewBox="0 0 24 24"><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>;

export default function VerdictSheet({ product, passport, selfie, inBag, hasTrial, onAddToBag, onStartTrial, onNeedPassport, onClose }) {
  const r = useMemo(() => evaluate(product, passport), [product, passport]);
  const v = VERDICTS[r.verdict];
  const effects = vtoEffects(product);
  const [speaking, setSpeaking] = useState(false);
  const [shared, setShared] = useState('');
  const canSpeak = typeof speechSynthesis !== 'undefined';

  useEffect(() => () => { if (canSpeak) speechSynthesis.cancel(); }, [canSpeak]);

  const summary = `${product.name}: ${v.label}${r.score != null ? `, ${r.score} out of 100` : ''}. ${r.reasons.map((x) => x.text).join('. ')}.`;

  const speak = () => {
    if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(summary);
    u.rate = 1;
    u.onend = u.onerror = () => setSpeaking(false);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const share = async () => {
    const text = `ShelfSense says: ${summary}`;
    try {
      if (navigator.share) { await navigator.share({ title: 'ShelfSense verdict', text, url: location.origin }); return; }
      await navigator.clipboard.writeText(`${text} ${location.origin}`);
      setShared('Copied');
    } catch {
      setShared('');
      return;
    }
    setTimeout(() => setShared(''), 1800);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={product.name} onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close" onClick={onClose} aria-label="Close">×</button>

        <div className="sheet-product">
          {product.image
            ? <img src={product.image} alt="" />
            : <span className="swatch lg" style={{ background: product.color ?? '#eee6de' }} />}
          <div>
            <p className="small muted">{product.brand}{product.demo ? ' · Demo' : ''}</p>
            <h2 className="sheet-title">{product.name}</h2>
          </div>
        </div>

        <div className={`verdict-row ${v.tone}`}>
          <span className="v-badge"><i />{v.label}</span>
          {r.score != null && <span className="v-score">{r.score}<small> / 100</small></span>}
        </div>

        <div className="quick-actions">
          {canSpeak && <button className={speaking ? 'on' : ''} onClick={speak}>{speaking ? STOP : SPEAK}{speaking ? 'Stop' : 'Read aloud'}</button>}
          <button onClick={share}>{SHARE}{shared || 'Share'}</button>
        </div>

        {!passport && (
          <p className="note-banner">
            This is a general verdict. <button className="link-btn" onClick={onNeedPassport}>Scan your skin</button> to make it personal.
          </p>
        )}

        <ul className="reasons">
          {r.reasons.map((x) => <li key={x.text} className={x.tone}>{x.text}</li>)}
        </ul>

        {effects && <TryOn selfie={selfie} effects={effects} shade={product.shade} onNeedPassport={onNeedPassport} />}

        {product.ingredients
          ? <IngredientChips text={product.ingredients} passport={passport} source={product.source} />
          : <p className="small muted">No ingredient list available. Source: {product.source}</p>}

        <div className="sheet-actions">
          <button className="btn" onClick={onAddToBag} disabled={inBag}>{inBag ? 'In your bag' : 'Add to bag'}</button>
          {product.kind === 'skincare' && (
            <button className="btn btn-light" onClick={onStartTrial} disabled={hasTrial || !passport}>
              {hasTrial ? 'Trial running' : 'Start 30-day trial'}
            </button>
          )}
        </div>
        {product.kind === 'skincare' && !passport && <p className="fineprint">A trial needs your Skin Passport as its Day 0.</p>}
      </div>
    </div>
  );
}
