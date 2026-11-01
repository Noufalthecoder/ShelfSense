// Illustrated portrait in profile, facing the product. The figure rises in once,
// a scan sweeps the face, then the skin readings appear as tags.

const READINGS = [
  { x: 236, y: 140, label: 'Oily T-zone', ty: 112 },
  { x: 232, y: 262, label: 'Dark spots · mild', ty: 226 },
  { x: 226, y: 340, label: 'Redness · low', ty: 352 },
];

// rough text width for Inter 13px, used to size the tag pills
const tagWidth = (s) => Math.round(s.length * 7.1 + 30);

export default function Portrait() {
  return (
    <svg className="portrait" viewBox="0 0 470 520" role="img" aria-label="Illustration of a woman in profile, her skin being analysed">
      <defs>
        <radialGradient id="halo" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#f8dccd" />
          <stop offset="65%" stopColor="#f3e3da" />
          <stop offset="100%" stopColor="#f3e3da" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="skin" cx="62%" cy="48%" r="60%">
          <stop offset="0%" stopColor="#f7d9c6" />
          <stop offset="70%" stopColor="#efc2a8" />
          <stop offset="100%" stopColor="#e3ad91" />
        </radialGradient>
        <linearGradient id="neck" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d99e82" />
          <stop offset="35%" stopColor="#ebb99d" />
          <stop offset="100%" stopColor="#f0c6ad" />
        </linearGradient>
        <linearGradient id="hair" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#5b3628" />
          <stop offset="55%" stopColor="#3a2219" />
          <stop offset="100%" stopColor="#2a1812" />
        </linearGradient>
        <linearGradient id="lips" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d26b74" />
          <stop offset="100%" stopColor="#b44b5a" />
        </linearGradient>
        <radialGradient id="blush">
          <stop offset="0%" stopColor="#ef8f8f" stopOpacity=".55" />
          <stop offset="100%" stopColor="#ef8f8f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pearl" cx="35%" cy="35%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e9dccf" />
        </radialGradient>
        <linearGradient id="sweep" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#cf6b7b" stopOpacity="0" />
          <stop offset="100%" stopColor="#cf6b7b" stopOpacity=".14" />
        </linearGradient>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="tagShadow" x="-20%" y="-40%" width="140%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#5a3a2a" floodOpacity=".14" />
        </filter>
        <clipPath id="haloClip">
          <circle cx="210" cy="250" r="200" />
        </clipPath>
        <clipPath id="faceClip">
          <path id="facePath" d="M246 96 C263 119 267 150 263 175 C261 185 263 192 269 205 C281 228 294 248 299 262 C301 270 293 277 282 277 C278 278 276 283 278 289 C285 293 289 298 285 303 C282 305 278 306 280 309 C287 313 286 322 278 326 C272 330 271 336 276 345 C282 360 274 376 256 381 C236 386 214 380 199 370 C184 360 174 330 171 300 L158 150 C168 110 205 84 246 96 Z" />
        </clipPath>
      </defs>

      <circle cx="210" cy="250" r="200" fill="url(#halo)" />

      <g className="figure" clipPath="url(#haloClip)">
        {/* long hair behind the neck */}
        <path fill="url(#hair)" d="M150 118 C106 168 96 252 110 322 C122 384 98 446 66 520 L190 520 C176 456 178 404 184 360 Z" />

        {/* neck and shoulders */}
        <path fill="url(#neck)" d="M222 380 C221 425 228 462 246 496 C284 502 330 510 372 528 L84 528 C120 508 150 492 158 470 C168 440 172 410 170 368 Z" />
        <ellipse cx="214" cy="392" rx="46" ry="14" fill="#b97e64" opacity=".35" filter="url(#soft)" />

        {/* face */}
        <use href="#facePath" fill="url(#skin)" />
        <g clipPath="url(#faceClip)">
          <ellipse cx="236" cy="266" rx="34" ry="20" fill="url(#blush)" />
          <ellipse cx="243" cy="236" rx="20" ry="6" fill="#fff" opacity=".55" filter="url(#soft)" transform="rotate(-18 243 236)" />
          <ellipse cx="282" cy="240" rx="4" ry="14" fill="#fff" opacity=".6" filter="url(#soft)" transform="rotate(-28 282 240)" />
          <ellipse cx="250" cy="130" rx="10" ry="18" fill="#fff" opacity=".35" filter="url(#soft)" />
        </g>

        {/* brow, closed eye, lashes */}
        <path fill="#4a2c22" d="M219 188 C231 177 248 176 259 185 C249 182 233 183 219 191 Z" />
        <path d="M228 205 C236 201 246 201 253 206" fill="none" stroke="#c48c74" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
        <path d="M226 210 C234 217 246 218 254 211" fill="none" stroke="#2a1812" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M233 215 l-3 6 M240 217 l-1.5 7 M247 216 l1 7 M252 213 l3 5.5" fill="none" stroke="#2a1812" strokeWidth="1.4" strokeLinecap="round" />

        {/* lips */}
        <path fill="url(#lips)" d="M278 289 C285 293 289 298 285 303 C282 305 278 306 270 305 C273 300 275 294 278 289 Z" />
        <path fill="url(#lips)" d="M280 309 C287 313 286 322 278 326 C272 324 270 316 270 311 Z" />
        <path d="M270 306 C274 307 278 307 281 308" fill="none" stroke="#8d3343" strokeWidth="1" strokeLinecap="round" />

        {/* hair over the crown, swept behind the ear */}
        <path fill="url(#hair)" d="M247 97 C238 80 214 64 184 65 C138 66 104 100 97 152 C90 204 104 254 120 302 C132 342 126 384 108 424 C148 396 168 352 177 312 C184 268 188 222 201 172 C211 136 229 112 247 97 Z" />
        <g fill="none" stroke="#a0674c" strokeLinecap="round" opacity=".45">
          <path d="M204 76 C162 86 128 128 120 192" strokeWidth="1.4" />
          <path d="M226 88 C190 108 160 158 150 228 C143 280 141 330 128 380" strokeWidth="1.2" />
          <path d="M236 98 C212 122 194 168 188 220" strokeWidth="1" />
        </g>

        {/* ear and pearl */}
        <path fill="#e8b297" d="M192 262 C180 262 176 282 184 297 C188 304 196 304 199 296 C202 286 202 268 192 262 Z" />
        <path d="M190 272 C186 278 187 288 192 293" fill="none" stroke="#c88d73" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="193" y1="302" x2="193" y2="312" stroke="#cfa46a" strokeWidth="1.6" />
        <circle cx="193" cy="318" r="6" fill="url(#pearl)" />
      </g>

      {/* one scan pass over the face */}
      <g clipPath="url(#haloClip)">
        <g className="sweep">
          <rect x="0" y="-70" width="470" height="70" fill="url(#sweep)" />
          <line x1="0" x2="470" y1="0" y2="0" stroke="#cf6b7b" strokeWidth="1.2" />
        </g>
      </g>

      {READINGS.map((r, i) => {
        const w = tagWidth(r.label);
        return (
          <g key={r.label} className="reading" style={{ animationDelay: `${2.2 + i * .22}s` }}>
            <polyline points={`${r.x},${r.y} ${r.x + 36},${r.ty} 318,${r.ty}`} fill="none" stroke="#cf6b7b" strokeWidth="1" strokeOpacity=".7" />
            <circle cx={r.x} cy={r.y} r="10" fill="#fff" fillOpacity=".5" stroke="#fff" strokeWidth="1" />
            <circle cx={r.x} cy={r.y} r="4" fill="#cf6b7b" />
            <g filter="url(#tagShadow)">
              <rect x="318" y={r.ty - 15} width={w} height="30" rx="15" fill="#fff" />
            </g>
            <circle cx="333" cy={r.ty} r="3.5" fill="#cf6b7b" />
            <text x="343" y={r.ty + 4.5}>{r.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
