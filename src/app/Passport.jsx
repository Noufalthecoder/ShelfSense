import { useState } from 'react';
import SelfieCapture from './SelfieCapture.jsx';
import { analyzeSkin } from './api.js';
import { CONCERNS, LEVEL_LABEL, level, rankConcerns } from './concerns.js';

export default function Passport({ passport, setPassport, setSelfie, onScan }) {
  const [mode, setMode] = useState(passport ? 'result' : 'intro');
  const [shot, setShot] = useState(null);
  const [error, setError] = useState(null);

  const run = async (s) => {
    setShot(s);
    setMode('analyzing');
    setError(null);
    try {
      const r = await analyzeSkin(s.blob);
      if (!Object.keys(r.scores ?? {}).length) throw new Error('No skin scores came back. Try another photo.');
      setPassport({ ...r, createdAt: Date.now() });
      setSelfie(s.dataUrl);
      setMode('result');
    } catch (e) {
      // straight back to the camera with the tip, so a retake is one tap away
      setError(e.message);
      setMode('camera');
    }
  };

  if (mode === 'camera') {
    return (
      <SelfieCapture
        title="Your Skin Passport"
        notice={error}
        onCapture={run}
        onCancel={() => { setError(null); setMode(passport ? 'result' : 'intro'); }}
      />
    );
  }

  if (mode === 'analyzing') {
    return (
      <div className="analyzing">
        <div className="analyzing-photo">
          <img src={shot.dataUrl} alt="Your selfie being analysed" />
          <i className="analyzing-scan" />
        </div>
        <p className="analyzing-title">Reading your skin</p>
        <p className="muted">YouCam AI is checking 8 skin concerns. This takes about 10–30 seconds.</p>
      </div>
    );
  }

  if (mode === 'intro' || !passport) {
    return (
      <div className="screen intro">
        <p className="eyebrow">Step 1</p>
        <h1 className="screen-title">Create your Skin Passport</h1>
        <p className="muted">One selfie. YouCam AI maps breakouts, dark spots, redness, oiliness, pores, hydration, texture and fine lines. Every product verdict is based on it.</p>
        <ul className="tips">
          <li>Face a window or soft, even light</li>
          <li>Take off glasses, pull hair back</li>
          <li>Look straight ahead, neutral expression</li>
        </ul>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-block" onClick={() => setMode('camera')}>Take my selfie</button>
        <p className="fineprint">Your photo is sent to YouCam only for analysis. Your Skin Passport stays on this device.</p>
      </div>
    );
  }

  const ranked = rankConcerns(passport.scores);
  return (
    <div className="screen">
      <div className="passport-head">
        <div>
          <p className="eyebrow">Your Skin Passport</p>
          <h1 className="screen-title">{new Date(passport.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} scan</h1>
        </div>
        {passport.overall != null && (
          <div className="score-ring" style={{ '--p': passport.overall }}>
            <b>{passport.overall}</b><small>skin score</small>
          </div>
        )}
      </div>
      {passport.skinAge != null && <p className="muted">Estimated skin age <b>{passport.skinAge}</b></p>}
      {passport.simulated && (
        <p className="note-banner">
          <b>Demo scores.</b> YouCam credits are used up, so these scores are simulated. Add credits for a real analysis.
        </p>
      )}

      <ul className="concerns">
        {ranked.map(([key, ui]) => {
          const lv = level(ui);
          return (
            <li key={key}>
              <div className="concern-top">
                <span>{CONCERNS[key]}</span>
                <span className={`level ${lv}`}>{LEVEL_LABEL[lv]}</span>
              </div>
              <div className="bar"><i className={lv} style={{ width: `${ui}%` }} /></div>
            </li>
          );
        })}
      </ul>
      <p className="fineprint">Higher is healthier. Scores come from YouCam AI Skin Analysis.</p>

      {error && <p className="error">{error}</p>}
      <div className="stack">
        <button className="btn btn-block" onClick={onScan}>Scan a product</button>
        <button className="btn btn-light btn-block" onClick={() => setMode('camera')}>Rescan my skin</button>
      </div>
    </div>
  );
}
