import { useState } from 'react';
import { useCamera } from './useCamera.js';
import { captureGuide, loadImage, toJpeg } from './api.js';

// oval sits at x 58–242, y 68–312 of the 300×400 guide; crop to it with a little margin
const GUIDE_BOX = { x: .12, y: .08, w: .76, h: .8 };

// Front camera with a face oval. Hands back { blob, dataUrl } as a JPEG.
export default function SelfieCapture({ title, notice, onCapture, onCancel }) {
  const { ref, ready, error } = useCamera('user');
  const [warning, setWarning] = useState(null);

  const check = (shot) => {
    if (Math.min(shot.width, shot.height) < 480) {
      setWarning('That image is too small for skin analysis (needs at least 480 px on the short side).');
      return;
    }
    onCapture(shot);
  };

  const shoot = async () => check(await captureGuide(ref.current, GUIDE_BOX));

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      check(await toJpeg(await loadImage(file)));
    } catch (err) {
      setWarning(err.message);
    }
  };

  return (
    <div className="capture">
      <p className="capture-title">{title}</p>
      {notice && <p className="error">{notice}</p>}
      <div className="capture-stage">
        <video ref={ref} className="mirror" playsInline muted />
        <svg className="oval" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <mask id="ovalHole">
              <rect width="300" height="400" fill="#fff" />
              <ellipse cx="150" cy="190" rx="92" ry="122" fill="#000" />
            </mask>
          </defs>
          <rect width="300" height="400" fill="rgba(26,23,20,.45)" mask="url(#ovalHole)" />
          <ellipse cx="150" cy="190" rx="92" ry="122" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="5 6" />
        </svg>
        {error && <p className="capture-error">{error}<br />You can upload a photo instead.</p>}
      </div>
      <p className="capture-hint">Fill the oval with your face · soft, even light · no glasses</p>
      {warning && <p className="error">{warning}</p>}
      <div className="capture-actions">
        <button className="link-btn" onClick={onCancel}>Cancel</button>
        <button className="shutter" disabled={!ready} onClick={shoot} aria-label="Take photo" />
        <label className="link-btn">
          Upload
          <input type="file" accept="image/jpeg,image/png" hidden onChange={upload} />
        </label>
      </div>
    </div>
  );
}
