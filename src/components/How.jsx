const ICONS = {
  scan: (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M6 13V9a3 3 0 0 1 3-3h4M27 6h4a3 3 0 0 1 3 3v4M34 27v4a3 3 0 0 1-3 3h-4M13 34H9a3 3 0 0 1-3-3v-4" />
      <circle cx="20" cy="18" r="6" />
      <path d="M11 32c1.5-4.5 5-7 9-7s7.5 2.5 9 7" />
    </svg>
  ),
  barcode: (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M8 10v20M12 10v20M17 10v20M20 10v20M25 10v20M29 10v20M32 10v20" />
      <path d="M4 20h32" strokeWidth="1.2" />
    </svg>
  ),
  sparkle: (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 5l3.5 9.5L33 18l-9.5 3.5L20 31l-3.5-9.5L7 18l9.5-3.5z" />
      <path d="M31 28l1.2 3 2.8 1-2.8 1-1.2 3-1.2-3-2.8-1 2.8-1z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6v28h28" />
      <path d="M11 12l7 7 5-4 9 10" />
      <circle cx="32" cy="25" r="1.6" fill="currentColor" />
    </svg>
  ),
};

const STEPS = [
  ['scan', 'Scan your skin once', 'One selfie. YouCam AI skin analysis and skin tone analysis build your private Skin Passport.'],
  ['barcode', 'Scan any product', 'Point your camera at a barcode in any store or on any shop page. ShelfSense reads the full ingredient list.'],
  ['sparkle', 'Get your verdict', 'Suits you, patch test first, or skip it, with reasons from your own scan. For makeup, see the exact shade on your face.'],
  ['chart', 'Track the proof', 'Start a 30-day trial. A quick weekly selfie shows whether the product is really working on your skin.'],
];

// cards lean toward the pointer, with a soft glare that follows it
function tilt(e) {
  if (e.pointerType !== 'mouse') return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty('--ry', `${(x - .5) * 14}deg`);
  el.style.setProperty('--rx', `${(.5 - y) * 14}deg`);
  el.style.setProperty('--gx', `${x * 100}%`);
  el.style.setProperty('--gy', `${y * 100}%`);
  el.classList.add('tilting');
}
function untilt(e) {
  const el = e.currentTarget;
  el.style.setProperty('--rx', '0deg');
  el.style.setProperty('--ry', '0deg');
  el.classList.remove('tilting');
}

export default function How() {
  return (
    <section className="section" id="how">
      <div className="section-head fade">
        <p className="eyebrow">How it works</p>
        <h2>One scan of your skin. <em>Every</em> shelf makes sense.</h2>
      </div>
      <ol className="how">
        {STEPS.map(([icon, title, body], i) => (
          <li key={title} className="fade" style={{ transitionDelay: `${i * .08}s` }}>
            <div className="card" onPointerMove={tilt} onPointerLeave={untilt}>
              {ICONS[icon]}
              <p className="n">0{i + 1}</p>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
