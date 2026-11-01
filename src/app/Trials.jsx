import { useState } from 'react';
import SelfieCapture from './SelfieCapture.jsx';
import { analyzeSkin } from './api.js';
import { CONCERNS } from './concerns.js';
import { DEMO_PRODUCTS } from './catalog.js';

const DAY = 864e5;
const LINE_COLORS = ['#3f9a6c', '#cf6b7b', '#c99a3e'];

export function newTrial(product, targets, passport) {
  return {
    id: `${product.code}-${Date.now()}`,
    product: { code: product.code, name: product.name, brand: product.brand, color: product.color },
    targets: targets.length ? targets.slice(0, 3) : ['moisture'],
    startedAt: Date.now(),
    checkins: [{ at: Date.now(), scores: passport.scores }],
  };
}

function exampleTrial() {
  const start = Date.now() - 28 * DAY;
  const series = {
    age_spot: [72, 74, 77, 80, 83],
    oiliness: [70, 71, 74, 76, 77],
    pore: [74, 74, 76, 78, 79],
    redness: [91, 92, 91, 92, 92],
  };
  const p = DEMO_PRODUCTS[0];
  return {
    id: `example-${Date.now()}`,
    example: true,
    product: { code: p.code, name: p.name, brand: p.brand, color: p.color },
    targets: ['age_spot', 'oiliness', 'pore'],
    startedAt: start,
    checkins: [0, 7, 14, 21, 28].map((d, i) => ({
      at: start + d * DAY,
      scores: Object.fromEntries(Object.entries(series).map(([k, v]) => [k, v[i]])),
    })),
  };
}

// ui_score is higher-is-better, so a positive delta is an improvement
function trialVerdict(trial) {
  const first = trial.checkins[0];
  const last = trial.checkins.at(-1);
  const days = Math.round((last.at - trial.startedAt) / DAY);
  if (trial.checkins.length < 2) return { tone: 'neutral', text: 'Check in once a week to start tracking.' };
  const redness = (last.scores.redness ?? 0) - (first.scores.redness ?? 0);
  if (redness <= -6) return { tone: 'bad', text: 'Redness went up. Pause it and patch test.' };
  if (days < 21) return { tone: 'neutral', text: `Day ${days}: too early to judge. Most actives need 4–8 weeks.` };
  const deltas = trial.targets.map((c) => (last.scores[c] ?? 0) - (first.scores[c] ?? 0));
  const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  if (avg >= 4) return { tone: 'good', text: "It's working. Keep using it." };
  return { tone: 'neutral', text: 'No clear change yet. Consider switching.' };
}

function Chart({ trial }) {
  const W = 320;
  const H = 130;
  const xs = trial.checkins.map((c) => (c.at - trial.startedAt) / DAY);
  const maxX = Math.max(28, ...xs);
  const vals = trial.checkins.flatMap((c) => trial.targets.map((t) => c.scores[t] ?? 0));
  const lo = Math.min(...vals) - 4;
  const hi = Math.max(...vals) + 4;
  const px = (d) => 16 + (d / maxX) * (W - 32);
  const py = (v) => 10 + (1 - (v - lo) / (hi - lo || 1)) * (H - 30);

  return (
    <svg className="trial-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Skin scores over the trial">
      {[0, 7, 14, 21, 28].filter((d) => d <= maxX).map((d) => (
        <text key={d} x={px(d)} y={H - 4} textAnchor="middle">{d ? `Wk ${d / 7}` : 'Day 0'}</text>
      ))}
      {trial.targets.map((t, i) => (
        <g key={t} stroke={LINE_COLORS[i]} fill={LINE_COLORS[i]}>
          <polyline fill="none" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"
            points={trial.checkins.map((c) => `${px((c.at - trial.startedAt) / DAY)},${py(c.scores[t] ?? 0)}`).join(' ')} />
          {trial.checkins.map((c) => <circle key={c.at} cx={px((c.at - trial.startedAt) / DAY)} cy={py(c.scores[t] ?? 0)} r="3" stroke="none" />)}
        </g>
      ))}
    </svg>
  );
}

function TrialCard({ trial, onCheckIn, onRemove }) {
  const first = trial.checkins[0];
  const last = trial.checkins.at(-1);
  const verdict = trialVerdict(trial);
  const day = Math.max(0, Math.round((Date.now() - trial.startedAt) / DAY));

  return (
    <article className="trial">
      <header className="trial-head">
        <span className="swatch" style={{ background: trial.product.color ?? '#eee6de' }} />
        <div>
          <h3>{trial.product.name}</h3>
          <p className="small muted">{trial.example ? 'Example trial · sample data' : `Day ${day} of 30 · ${trial.checkins.length - 1} check-ins`}</p>
        </div>
      </header>

      {trial.checkins.length > 1 && <Chart trial={trial} />}

      <ul className="deltas">
        {trial.targets.map((t, i) => {
          const d = (last.scores[t] ?? 0) - (first.scores[t] ?? 0);
          return (
            <li key={t}>
              <span><i style={{ background: LINE_COLORS[i] }} />{CONCERNS[t]}</span>
              <b className={d > 0 ? 'good' : d < 0 ? 'bad' : ''}>{first.scores[t] ?? '–'} → {last.scores[t] ?? '–'}</b>
            </li>
          );
        })}
      </ul>

      <p className={`trial-verdict ${verdict.tone}`}>{verdict.text}</p>
      {trial.checkins.some((c) => c.simulated) && (
        <p className="fineprint">Includes demo check-ins with simulated scores (no YouCam credits).</p>
      )}

      <div className="trial-actions">
        {!trial.example && <button className="btn btn-sm" onClick={onCheckIn}>Weekly check-in</button>}
        <button className="link-btn small" onClick={onRemove}>Remove</button>
      </div>
    </article>
  );
}

export default function Trials({ trials, setTrials, onScan }) {
  const [checking, setChecking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const checkIn = async (shot) => {
    const id = checking;
    setChecking(null);
    setBusy(true);
    setError(null);
    try {
      const r = await analyzeSkin(shot.blob);
      const checkin = { at: Date.now(), scores: r.scores, ...(r.simulated && { simulated: true }) };
      setTrials((ts) => ts.map((t) => (t.id === id ? { ...t, checkins: [...t.checkins, checkin] } : t)));
    } catch (e) {
      setError(e.message);
      setChecking(id);
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return <SelfieCapture title="Weekly check-in" notice={error} onCapture={checkIn} onCancel={() => { setError(null); setChecking(null); }} />;
  }

  return (
    <div className="screen">
      <p className="eyebrow">Track the proof</p>
      <h1 className="screen-title">Is it working?</h1>
      <p className="muted">Start a trial from any skincare verdict. A weekly selfie re-scans your skin, so you see real change, not marketing.</p>
      <p className="fineprint">Check in at the same spot and light each time. Lighting changes scores.</p>

      {busy && <p className="note-banner">Analysing your check-in with YouCam AI…</p>}
      {error && <p className="error">{error}</p>}

      <div className="trial-list">
        {trials.map((t) => (
          <TrialCard key={t.id} trial={t} onCheckIn={() => setChecking(t.id)} onRemove={() => setTrials((ts) => ts.filter((x) => x.id !== t.id))} />
        ))}
      </div>

      {!trials.length && (
        <div className="empty">
          <p>No trials yet.</p>
          <button className="btn btn-block" onClick={onScan}>Scan a product to start</button>
        </div>
      )}
      {!trials.some((t) => t.example) && (
        <button className="link-btn small" onClick={() => setTrials((ts) => [...ts, exampleTrial()])}>Add an example 4-week trial</button>
      )}
    </div>
  );
}
