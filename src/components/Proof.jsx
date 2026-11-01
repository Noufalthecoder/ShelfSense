// 30-day trial progress card. Values are an illustrative example (dark-spot score, lower is better).
const WEEKS = ['Day 0', 'Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
const POINTS = [[20, 37], [90, 46], [160, 80], [230, 106], [300, 131]];
const LINE = 'M20 37 C55 40 60 44 90 46 C125 49 130 70 160 80 C195 91 200 98 230 106 C265 116 270 126 300 131';

export default function Proof() {
  return (
    <div className="proof-card">
      <div className="proof-head">
        <div>
          <p className="proof-title">Dark spots</p>
          <p className="proof-sub">Serum Nº 10 · 30-day trial</p>
        </div>
        <span className="proof-delta">↓ 18%</span>
      </div>

      <svg className="proof-chart" viewBox="0 0 320 172" aria-label="Dark spots score falling steadily over four weeks">
        <defs>
          <linearGradient id="proofArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2e8b57" stopOpacity=".18" />
            <stop offset="100%" stopColor="#2e8b57" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[37, 84, 131].map((y) => <line key={y} x1="20" x2="300" y1={y} y2={y} stroke="#e6ded5" strokeDasharray="3 4" />)}
        <path className="proof-area" d={`${LINE} L300 150 L20 150 Z`} fill="url(#proofArea)" />
        <path className="proof-line" d={LINE} pathLength="1" fill="none" stroke="#2e8b57" strokeWidth="2.5" strokeLinecap="round" />
        {POINTS.map(([x, y], i) => (
          <circle key={x} className="proof-dot" cx={x} cy={y} r={i === POINTS.length - 1 ? 5 : 3.5} fill="#fff" stroke="#2e8b57" strokeWidth="2" style={{ transitionDelay: `${.3 + i * .25}s` }} />
        ))}
        {WEEKS.map((w, i) => <text key={w} x={POINTS[i][0]} y="168" textAnchor="middle">{w}</text>)}
      </svg>

      <div className="proof-foot">
        <span className="verdict-badge"><i />It's working · keep using it</span>
      </div>
    </div>
  );
}
