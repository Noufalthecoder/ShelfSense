import { VERDICTS } from './ingredients.js';

// Every product scanned this session, ranked for your skin.
export default function Compare({ shelf, bestCode, onOpen, onAddToBag, onClear, onClose }) {
  const best = shelf.find((s) => s.code === bestCode);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Compare your shelf" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close" onClick={onClose} aria-label="Close">×</button>
        <div>
          <p className="eyebrow">Your shelf</p>
          <h2 className="sheet-title">{shelf.length} products, ranked for your skin</h2>
        </div>

        <ol className="compare-list">
          {shelf.map((s, i) => {
            const v = VERDICTS[s.r.verdict];
            return (
              <li key={s.code} className={s.code === bestCode ? 'best' : ''}>
                <button onClick={() => onOpen(s.product)}>
                  <span className="rank">{i + 1}</span>
                  <span className="swatch" style={{ background: s.product.color ?? '#e6ded5' }} />
                  <span className="compare-body">
                    {s.code === bestCode && <span className="best-tag">★ Best pick</span>}
                    <b>{s.product.name}</b>
                    <small>{s.r.reasons[0]?.text}</small>
                  </span>
                  <span className={`compare-score ${v.tone}`}>
                    {s.r.score ?? '–'}
                    <small>{v.label}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="sheet-actions">
          {best && <button className="btn" onClick={() => onAddToBag(best.product)}>Add best pick to bag</button>}
          <button className="btn btn-light" onClick={onClear}>Clear shelf</button>
        </div>
      </div>
    </div>
  );
}
