import { DEMO_PRODUCTS } from './catalog.js';

// EAN-13 encoding tables
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = L.map((p) => [...p].map((b) => (b === '0' ? '1' : '0')).join(''));
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

function ean13Bits(code) {
  const d = [...code].map(Number);
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (PARITY[d[0]][i - 1] === 'L' ? L : G)[d[i]];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[d[i]];
  return bits + '101';
}

function Barcode({ code }) {
  const bits = ean13Bits(code);
  const quiet = 10;
  const width = bits.length + quiet * 2;
  return (
    <svg viewBox={`0 0 ${width} 60`} className="barcode" role="img" aria-label={`Barcode ${code}`}>
      <rect width={width} height="60" fill="#fff" />
      {[...bits].map((b, i) => (b === '1' ? <rect key={i} x={quiet + i} y="4" width="1" height="44" fill="#000" /> : null))}
      <text x={width / 2} y="57" textAnchor="middle">{code}</text>
    </svg>
  );
}

// open on a second screen or print, then scan with the phone
export default function DemoCodes({ onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet codes" role="dialog" aria-modal="true" aria-label="Demo barcodes" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="sheet-title">Demo barcodes</h2>
        <p className="muted small">Show these on another screen or print them, then scan with your phone. Real products are looked up on Open Beauty Facts.</p>
        <div className="codes-grid">
          {DEMO_PRODUCTS.map((p) => (
            <figure key={p.code}>
              <Barcode code={p.code} />
              <figcaption>{p.name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
