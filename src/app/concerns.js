// YouCam skin-analysis concerns. ui_score runs 0–100, higher meaning healthier skin for that concern.
export const CONCERNS = {
  acne: 'Breakouts',
  age_spot: 'Dark spots',
  redness: 'Redness',
  oiliness: 'Oiliness',
  pore: 'Pores',
  moisture: 'Hydration',
  texture: 'Texture',
  wrinkle: 'Fine lines',
};

// 0 = nothing to address, 1 = clear focus area.
// Calibrated to real YouCam output, which mostly lands between 70 and 99.
export const severity = (ui) => (ui == null ? .5 : Math.min(Math.max((92 - ui) / 22, 0), 1));

export const level = (ui) => (ui >= 88 ? 'good' : ui >= 76 ? 'mild' : 'focus');
export const LEVEL_LABEL = { good: 'Looking good', mild: 'Mild', focus: 'Focus area' };

// concerns worth showing first: worst score first
export function rankConcerns(scores = {}) {
  return Object.entries(scores)
    .filter(([k]) => CONCERNS[k])
    .sort((a, b) => a[1] - b[1]);
}
