import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCamera } from './useCamera.js';
import { lookupProduct } from './api.js';
import { evaluate, VERDICTS } from './ingredients.js';
import { DEMO_PRODUCTS } from './catalog.js';
import Compare from './Compare.jsx';

const STALE_MS = 900;
const DROP_MS = 2500;

// map a box in video pixels to the <video> element, which uses object-fit: cover
function toElement(video, { cx, cy, w, h }) {
  const cw = video.clientWidth;
  const ch = video.clientHeight;
  const s = Math.max(cw / video.videoWidth, ch / video.videoHeight);
  const ox = (cw - video.videoWidth * s) / 2;
  const oy = (ch - video.videoHeight * s) / 2;
  return { x: cx * s + ox, y: cy * s + oy, w: w * s, h: h * s };
}

// native BarcodeDetector where available (Android, macOS), ZXing everywhere else
async function startDetection(video, onHit) {
  const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
  if ('BarcodeDetector' in window) {
    const supported = await window.BarcodeDetector.getSupportedFormats();
    if (supported.includes('ean_13')) {
      const detector = new window.BarcodeDetector({ formats: formats.filter((f) => supported.includes(f)) });
      let alive = true;
      let last = 0;
      let raf;
      const loop = async (t) => {
        if (!alive) return;
        if (t - last > 120 && video.readyState >= 2) {
          last = t;
          try {
            for (const b of await detector.detect(video)) {
              const bb = b.boundingBox;
              onHit(b.rawValue, { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2, w: bb.width, h: bb.height });
            }
          } catch { /* frame not ready */ }
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => { alive = false; cancelAnimationFrame(raf); };
    }
  }

  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  const { BarcodeFormat, DecodeHintType } = await import('@zxing/library');
  const hints = new Map([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128]],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 120 });
  const controls = await reader.decodeFromVideoElement(video, (result) => {
    if (!result) return;
    const pts = result.getResultPoints();
    const xs = pts.map((p) => p.getX());
    const ys = pts.map((p) => p.getY());
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const w = Math.max(maxX - minX, 120);
    // 1D results only give the scan row, so estimate the bar height from the width
    onHit(result.getText(), { cx: (minX + maxX) / 2, cy: ys.reduce((a, b) => a + b, 0) / ys.length, w, h: w * .5 });
  });
  return () => controls.stop();
}

export default function Scanner({ passport, onOpen, onAddToBag, onNeedPassport, onShowCodes }) {
  const { ref, ready, error } = useCamera('environment');
  const [tracks, setTracks] = useState({});
  const [items, setItems] = useState({});
  const [lastCode, setLastCode] = useState(null);
  const [manual, setManual] = useState('');
  const [now, setNow] = useState(performance.now());
  const [comparing, setComparing] = useState(false);
  const requested = useRef(new Set());

  const resolve = useCallback(async (code) => {
    if (requested.current.has(code)) return;
    requested.current.add(code);
    setItems((m) => ({ ...m, [code]: { status: 'loading' } }));
    try {
      const product = await lookupProduct(code);
      setItems((m) => ({ ...m, [code]: product ? { status: 'found', product } : { status: 'missing' } }));
      if (product) setLastCode(code);
    } catch {
      setItems((m) => ({ ...m, [code]: { status: 'missing' } }));
    }
  }, []);

  // everything found this session, best match for your skin first
  const shelf = useMemo(() => Object.entries(items)
    .filter(([, it]) => it.status === 'found')
    .map(([code, it]) => ({ code, product: it.product, r: evaluate(it.product, passport) }))
    .sort((a, b) => (b.r.score ?? -1) - (a.r.score ?? -1)), [items, passport]);
  const byCode = useMemo(() => Object.fromEntries(shelf.map((s) => [s.code, s])), [shelf]);
  const top = shelf[0];
  const bestCode = shelf.length >= 2 && top.r.score != null && top.r.verdict !== 'bad' ? top.code : null;

  // products opened from the demo list or typed in count as scanned too
  const shelve = (product) => {
    requested.current.add(product.code);
    setItems((m) => (m[product.code]?.status === 'found' ? m : { ...m, [product.code]: { status: 'found', product } }));
    setLastCode(product.code);
    onOpen(product);
  };

  const clearShelf = () => {
    requested.current.clear();
    setItems({});
    setTracks({});
    setLastCode(null);
    setComparing(false);
  };

  const onHit = useCallback((code, box) => {
    const video = ref.current;
    if (!video?.videoWidth) return;
    const p = toElement(video, box);
    setTracks((t) => {
      const prev = t[code];
      // ease toward the new position so tags glide instead of jumping
      const ease = (k) => (prev ? prev[k] + (p[k] - prev[k]) * .55 : p[k]);
      return { ...t, [code]: { x: ease('x'), y: ease('y'), w: ease('w'), h: ease('h'), seen: performance.now() } };
    });
    resolve(code);
  }, [ref, resolve]);

  useEffect(() => {
    if (!ready) return;
    let stop = () => {};
    let cancelled = false;
    startDetection(ref.current, onHit).then((s) => { if (cancelled) s(); else stop = s; });
    return () => { cancelled = true; stop(); };
  }, [ready, ref, onHit]);

  // fade tags that lost their barcode, then drop them
  useEffect(() => {
    const t = setInterval(() => {
      const n = performance.now();
      setNow(n);
      setTracks((tr) => {
        const keep = Object.entries(tr).filter(([, v]) => n - v.seen < DROP_MS);
        return keep.length === Object.keys(tr).length ? tr : Object.fromEntries(keep);
      });
    }, 300);
    return () => clearInterval(t);
  }, []);

  const lookupManual = async (e) => {
    e.preventDefault();
    const code = manual.replace(/\D/g, '');
    if (code.length < 8) return;
    const product = await lookupProduct(code).catch(() => null);
    if (product) {
      shelve(product);
    } else {
      setItems((m) => ({ ...m, [code]: { status: 'missing' } }));
      setLastCode(code);
    }
  };

  const last = lastCode && items[lastCode];

  return (
    <div className="scanner">
      <div className="scanner-view">
        <video ref={ref} playsInline muted />
        {!ready && !error && <p className="scanner-msg">Starting camera…</p>}
        {error && <p className="scanner-msg">{error}<br />Use a demo product or type a barcode below.</p>}
        {ready && !Object.keys(tracks).length && (
          <div className="scanner-guide" aria-hidden="true"><i /><span>Point at a barcode</span></div>
        )}

        {Object.entries(tracks).map(([code, t]) => {
          const it = items[code];
          const stale = now - t.seen > STALE_MS;
          let tone = 'neutral';
          let body = <span className="chip-name">Reading label…</span>;
          if (it?.status === 'missing') {
            body = <span className="chip-name">Not in database</span>;
          } else if (it?.status === 'found') {
            const { r } = byCode[code];
            const v = VERDICTS[r.verdict];
            tone = v.tone;
            body = (
              <>
                {code === bestCode && <span className="best-tag">★ Best pick</span>}
                <span className="chip-verdict"><i />{v.label}{r.score != null && <b>{r.score}</b>}</span>
                <span className="chip-name">{it.product.name}</span>
              </>
            );
          }
          return (
            <div key={code} className={`ar-track ${tone} ${stale ? 'stale' : ''} ${code === bestCode ? 'best' : ''}`} style={{ transform: `translate(${t.x}px, ${t.y}px)` }}>
              <i className="ar-bracket" style={{ width: t.w + 16, height: t.h + 16, left: -(t.w + 16) / 2, top: -(t.h + 16) / 2 }} />
              <button className="ar-chip" style={{ top: -(t.h + 16) / 2 - 10 }} onClick={() => it?.product && onOpen(it.product)} disabled={!it?.product}>{body}</button>
            </div>
          );
        })}
      </div>

      <div className="scanner-panel">
        {!passport && (
          <button className="note-banner as-button" onClick={onNeedPassport}>
            Verdicts are general until you create your Skin Passport. <b>Scan my skin →</b>
          </button>
        )}

        {shelf.length >= 2 && (
          <button className="compare-btn" onClick={() => setComparing(true)}>
            <span>
              <small>Compare your shelf · {shelf.length} products</small>
              {bestCode ? <>★ Best pick: {byCode[bestCode].product.name}</> : 'No product suits your skin yet'}
            </span>
            <span aria-hidden="true">›</span>
          </button>
        )}

        {last?.status === 'found' && shelf.length < 2 && (
          <button className="last-scan" onClick={() => onOpen(last.product)}>
            <span className="swatch" style={{ background: last.product.color ?? '#eee6de' }} />
            <span><small>Last scanned</small>{last.product.name}</span>
            <span aria-hidden="true">›</span>
          </button>
        )}
        {last?.status === 'missing' && <p className="muted small">Barcode {lastCode} isn't in Open Beauty Facts yet.</p>}

        <form className="manual" onSubmit={lookupManual}>
          <input inputMode="numeric" placeholder="Type a barcode" value={manual} onChange={(e) => setManual(e.target.value)} aria-label="Barcode number" />
          <button className="btn btn-sm" type="submit">Check</button>
        </form>

        <div className="demo-row">
          <p className="small muted">Demo products</p>
          <button className="link-btn small" onClick={onShowCodes}>Show barcodes</button>
        </div>
        <div className="demo-list">
          {DEMO_PRODUCTS.map((p) => (
            <button key={p.code} className={`demo-item ${byCode[p.code] ? 'scanned' : ''}`} onClick={() => shelve(p)}>
              <span className="swatch" style={{ background: p.color }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {comparing && (
        <Compare
          shelf={shelf}
          bestCode={bestCode}
          onOpen={(p) => { setComparing(false); onOpen(p); }}
          onAddToBag={(p) => { onAddToBag(p); setComparing(false); }}
          onClear={clearShelf}
          onClose={() => setComparing(false)}
        />
      )}
    </div>
  );
}
