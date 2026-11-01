import { useId } from 'react';

// "The scanned drop": a skincare drop inside AR scan corners, cut by a scan line.
export function LogoMark({ size = 28, inverted = false }) {
  const id = useId().replace(/:/g, '');
  const frame = inverted ? '#faf6f2' : '#2d2723';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="logo-svg">
      <defs>
        <linearGradient id={`${id}g`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e3836f" />
          <stop offset="100%" stopColor="#cf6b7b" />
        </linearGradient>
        <mask id={`${id}m`}>
          <rect width="48" height="48" fill="#fff" />
          <rect x="0" y="26.4" width="48" height="2.4" fill="#000" />
        </mask>
      </defs>
      <g fill="none" stroke={frame} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 15V9.5A3.5 3.5 0 0 1 9.5 6H15" />
        <path d="M33 6h5.5A3.5 3.5 0 0 1 42 9.5V15" />
        <path d="M42 33v5.5a3.5 3.5 0 0 1-3.5 3.5H33" />
        <path d="M15 42H9.5A3.5 3.5 0 0 1 6 38.5V33" />
      </g>
      <path mask={`url(#${id}m)`} fill={`url(#${id}g)`} d="M24 10.5c0 0-9.5 10.8-9.5 17.6a9.5 9.5 0 0 0 19 0C33.5 21.3 24 10.5 24 10.5Z" />
      <path d="M11 27.6h1.6M35.4 27.6h1.6" stroke="#cf6b7b" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ size = 28, inverted = false, href }) {
  const body = (
    <>
      <LogoMark size={size} inverted={inverted} />
      <span className="logo-word">ShelfSense</span>
    </>
  );
  return href ? <a className="logo" href={href} aria-label="ShelfSense home">{body}</a> : <span className="logo">{body}</span>;
}
