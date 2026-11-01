// Builds a morning and evening routine from the products in the bag, and flags clashing actives.
import { evaluate } from './ingredients.js';

const STEPS = [
  ['cleanser', 'Cleanse', /cleans|wash|foam|micellar|gel cleanser/],
  ['spf', 'Protect', /\bspf\b|sunscreen|sun ?screen|\bsun\b|uv/],
  ['toner', 'Tone', /toner|essence|mist|tonic/],
  ['eye', 'Eyes', /\beye/],
  ['moisturizer', 'Moisturise', /cream|moistur|lotion|balm|emulsion|butter/],
  ['serum', 'Treat', /serum|ampoule|treatment|drops|booster|oil\b/],
];
const ORDER = ['cleanser', 'toner', 'serum', 'eye', 'moisturizer', 'spf'];
export const STEP_LABEL = Object.fromEntries(STEPS.map(([k, l]) => [k, l]));

export function stepOf(product) {
  const name = (product.name || '').toLowerCase();
  return STEPS.find(([, , re]) => re.test(name))?.[0] ?? 'serum';
}

const AM_ONLY = { 'Vitamin C': 'Vitamin C protects best by day, under sunscreen.' };
const PM_ONLY = {
  Retinoid: 'Retinoids break down in sunlight, so they belong at night.',
  'AHA exfoliant': 'Acids make skin more sun-sensitive, so they belong at night.',
};
const CLASHES = [
  ['Retinoid', 'AHA exfoliant', 'Retinoid and AHA together can over-exfoliate. Use them on alternate nights.'],
  ['Retinoid', 'Benzoyl peroxide', 'Benzoyl peroxide can deactivate retinoids. Alternate days instead.'],
  ['Retinoid', 'Salicylic acid', 'Retinoid and BHA in one routine can be harsh. Alternate nights.'],
  ['AHA exfoliant', 'Salicylic acid', 'Two exfoliating acids in one routine is a lot. Pick one per night.'],
  ['Vitamin C', 'AHA exfoliant', 'Vitamin C and AHA together can sting. Keep vitamin C for the morning.'],
  ['Vitamin C', 'Benzoyl peroxide', 'Benzoyl peroxide oxidises vitamin C. Use them at different times.'],
];

const short = (p) => p.name.split(' · ')[0];

export function buildRoutine(products, passport) {
  const items = products
    .filter((p) => p.kind === 'skincare')
    .map((p) => {
      const r = evaluate(p, passport);
      return { product: p, step: stepOf(p), actives: r.matched.map((m) => m.name), r };
    });

  const am = [];
  const pm = [];
  const notes = [];
  for (const it of items) {
    const pmOnly = it.actives.find((a) => PM_ONLY[a]);
    const amOnly = it.actives.find((a) => AM_ONLY[a]);
    if (it.step === 'spf') am.push(it);
    else if (pmOnly) { pm.push(it); notes.push({ tone: 'info', text: `${short(it.product)} goes in your evening routine. ${PM_ONLY[pmOnly]}` }); }
    else if (amOnly) { am.push(it); notes.push({ tone: 'info', text: `${short(it.product)} goes in your morning routine. ${AM_ONLY[amOnly]}` }); }
    else { am.push(it); pm.push(it); }
  }
  const byStep = (a, b) => ORDER.indexOf(a.step) - ORDER.indexOf(b.step);
  am.sort(byStep);
  pm.sort(byStep);

  const warnings = [];
  for (const [when, list] of [['Morning', am], ['Evening', pm]]) {
    for (const [x, y, text] of CLASHES) {
      const a = list.find((it) => it.actives.includes(x));
      const b = list.find((it) => it.actives.includes(y) && it !== a);
      if (a && b) warnings.push({ when, text, products: [short(a.product), short(b.product)] });
    }
  }

  for (const it of items) {
    if (it.r.verdict === 'bad') notes.push({ tone: 'warn', text: `${short(it.product)} is marked Skip it for your skin. Consider swapping it for something gentler.` });
  }

  const sensitising = items.some((it) => it.actives.some((a) => PM_ONLY[a] || a === 'Salicylic acid'));
  if (items.length && !items.some((it) => it.step === 'spf')) {
    notes.unshift(sensitising
      ? { tone: 'warn', text: 'Your routine has acids or retinoids, so daily SPF 30+ is a must. Add a sunscreen to finish your morning.' }
      : { tone: 'info', text: 'Finish every morning with SPF 30+. It protects everything else you use.' });
  }
  return { am, pm, warnings, notes, count: items.length };
}
