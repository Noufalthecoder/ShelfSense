export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// shared pointer position in [-1, 1]
export const pointer = { x: 0, y: 0 };
addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });
