import { useMemo, useState } from 'react';
import { evaluate, VERDICTS } from './ingredients.js';
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

export default function VerdictSheet({ product, passport, selfie, inBag, hasTrial, onAddToBag, onStartTrial, onNeedPassport, onClose }) {
  const r = useMemo(() => evaluate(product, passport), [product, passport]);
  const v = VERDICTS[r.verdict];
  const effects = vtoEffects(product);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={product.name} onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close" onClick={onClose} aria-label="Close">×</button>

        <div className="sheet-product">
          {product.image
            ? <img src={product.image} alt="" />
            : <span className="swatch lg" style={{ background: product.color ?? '#e6ded5' }} />}
          <div>
            <p className="small muted">{product.brand}{product.demo ? ' · Demo' : ''}</p>
            <h2 className="sheet-title">{product.name}</h2>
          </div>
        </div>

        <div className={`verdict-row ${v.tone}`}>
          <span className="v-badge"><i />{v.label}</span>
          {r.score != null && <span className="v-score">{r.score}<small> / 100</small></span>}
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

        <details className="ingredients">
          <summary>Full ingredient list</summary>
          <p>{product.ingredients || 'Not available.'}</p>
          <p className="small muted">Source: {product.source}</p>
        </details>

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
