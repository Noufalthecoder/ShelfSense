// Ingredient rules: which skin concerns an ingredient helps or may aggravate.
// Weights are 0–1. This is consumer guidance, not medical advice.
import { CONCERNS, severity } from './concerns.js';

const HELP_PHRASE = {
  acne: 'helps clear breakouts',
  age_spot: 'fades dark spots',
  redness: 'calms redness',
  oiliness: 'balances oil',
  pore: 'refines pores',
  moisture: 'boosts hydration',
  texture: 'smooths texture',
  wrinkle: 'softens fine lines',
};

const RULES = [
  { name: 'Niacinamide', re: /niacinamide/, helps: { age_spot: 1, oiliness: .9, pore: .9, redness: .4 } },
  { name: 'Salicylic acid', re: /salicylic acid|\bbha\b|betaine salicylate/, helps: { acne: 1, pore: 1, oiliness: .7 }, hurts: { moisture: .3 } },
  { name: 'Zinc PCA', re: /zinc pca|zinc gluconate/, helps: { oiliness: 1, acne: .6 } },
  { name: 'Azelaic acid', re: /azelaic acid/, helps: { redness: 1, acne: .8, age_spot: .8 } },
  { name: 'Vitamin C', re: /ascorbic acid|ascorbyl|ascorbate/, helps: { age_spot: 1, texture: .4 } },
  { name: 'Alpha arbutin', re: /arbutin/, helps: { age_spot: 1 } },
  { name: 'Tranexamic acid', re: /tranexamic acid/, helps: { age_spot: 1 } },
  { name: 'Licorice root', re: /glycyrrhiza|licorice/, helps: { age_spot: .6, redness: .5 } },
  { name: 'Hyaluronic acid', re: /hyaluron/, helps: { moisture: 1 } },
  { name: 'Glycerin', re: /glycerin/, helps: { moisture: .5 } },
  { name: 'Ceramides', plural: true, re: /ceramide/, helps: { moisture: 1, redness: .5 } },
  { name: 'Squalane', re: /squalane/, helps: { moisture: .8 } },
  { name: 'Panthenol', re: /panthenol/, helps: { redness: .8, moisture: .5 } },
  { name: 'Centella asiatica', re: /centella|madecassoside|asiaticoside/, helps: { redness: 1 } },
  { name: 'Allantoin', re: /allantoin/, helps: { redness: .6 } },
  { name: 'Bisabolol', re: /bisabolol/, helps: { redness: .6 } },
  { name: 'Green tea', re: /camellia sinensis|green tea/, helps: { redness: .5, oiliness: .4 } },
  { name: 'Retinoid', re: /retinol|retinal\b|retinyl|adapalene/, helps: { wrinkle: 1, texture: 1, acne: .6 }, hurts: { redness: .5, moisture: .3 } },
  { name: 'Peptides', plural: true, re: /palmitoyl|peptide/, helps: { wrinkle: .7 } },
  { name: 'AHA exfoliant', re: /glycolic acid|lactic acid|mandelic acid/, helps: { texture: 1, age_spot: .5 }, hurts: { redness: .5 } },
  { name: 'Benzoyl peroxide', re: /benzoyl peroxide/, helps: { acne: 1 }, hurts: { moisture: .5, redness: .4 } },
  { name: 'Urea', re: /\burea\b/, helps: { moisture: .8, texture: .4 } },

  { name: 'Fragrance', re: /\b(parfum|fragrance|perfume)\b/, hurts: { redness: 1 }, note: 'can irritate sensitive skin' },
  { name: 'Drying alcohol', re: /alcohol denat|\bsd alcohol|\bethanol\b|(^|,)\s*alcohol\s*(,|$)/, hurts: { moisture: .8, redness: .6 }, note: 'can dry and irritate skin' },
  { name: 'Essential oils', re: /\b(limonene|linalool|citral|geraniol|eugenol|citronellol|menthol)\b|peppermint|lavandula/, hurts: { redness: .7 }, note: 'are common irritants' },
  { name: 'Coconut oil', re: /cocos nucifera oil|coconut oil/, hurts: { acne: 1, pore: .6 }, note: 'can clog pores' },
  { name: 'Isopropyl myristate', re: /isopropyl (myristate|palmitate|isostearate)/, hurts: { acne: 1, pore: .6 }, note: 'can clog pores' },
  { name: 'Heavy waxes & lanolin', re: /lanolin|myristyl myristate|theobroma cacao|cocoa butter/, hurts: { acne: .6, oiliness: .4 }, note: 'are heavy and can clog pores' },
  { name: 'Mineral oil', re: /mineral oil|paraffinum liquidum/, hurts: { oiliness: .4, acne: .3 }, note: 'feels heavy on oily skin' },
  { name: 'Sodium lauryl sulfate', re: /sodium lauryl sulfate/, hurts: { redness: .7, moisture: .6 }, note: 'is a harsh cleanser' },
];

export const VERDICTS = {
  good: { label: 'Suits you', tone: 'good' },
  warn: { label: 'Patch test first', tone: 'warn' },
  bad: { label: 'Skip it', tone: 'bad' },
  unknown: { label: 'Not enough info', tone: 'neutral' },
};

/**
 * Score a product against a Skin Passport.
 * Returns { score, verdict, reasons[], matched[], targets[] }.
 */
export function evaluate(product, passport) {
  const text = (product.ingredients || '').toLowerCase();
  if (!text.trim()) {
    return { score: null, verdict: 'unknown', reasons: [{ tone: 'neutral', text: 'No ingredient list found for this product.' }], matched: [], targets: [] };
  }
  const scores = passport?.scores ?? {};
  const sev = (c) => severity(scores[c]);
  const flagged = (c) => passport && sev(c) > .3;

  let benefit = 0;
  let harm = 0;
  const reasons = [];
  const matched = [];
  const targets = new Set();
  const explained = new Set();

  for (const rule of RULES) {
    if (!rule.re.test(text)) continue;
    let ruleGood = 0;
    let ruleBad = 0;
    let worstHurt = null;

    const helps = Object.entries(rule.helps ?? {}).map(([c, w]) => ({ c, w, v: w * (.3 + .7 * sev(c)) }));
    for (const { c, w, v } of helps) {
      ruleGood += v;
      if (w >= .6) targets.add(c);
    }
    // explain each ingredient by a concern no earlier ingredient already covered
    helps.sort((a, b) => b.v - a.v);
    // a fresh concern only if it still matters for this skin, otherwise repeat the main one
    const fresh = helps.find((h) => !explained.has(h.c));
    const bestHelp = fresh && fresh.v >= helps[0].v * .6 ? fresh : helps[0];
    for (const [c, w] of Object.entries(rule.hurts ?? {})) {
      const v = w * (.2 + .8 * sev(c));
      ruleBad += v;
      if (!worstHurt || v > worstHurt.v) worstHurt = { c, v };
    }
    benefit += ruleGood;
    harm += ruleBad;
    matched.push({ name: rule.name, tone: ruleGood >= ruleBad ? 'good' : 'bad' });

    if (bestHelp && ruleGood >= ruleBad) {
      const c = bestHelp.c;
      explained.add(c);
      const phrase = rule.plural ? HELP_PHRASE[c].replace(/^(\w+)s\b/, '$1') : HELP_PHRASE[c];
      reasons.push({ tone: 'good', weight: ruleGood, text: `${rule.name} ${phrase}${flagged(c) ? ', a focus in your scan' : ''}` });
    } else if (worstHurt) {
      const c = worstHurt.c;
      const note = rule.note ?? `may aggravate ${CONCERNS[c].toLowerCase()}`;
      reasons.push({ tone: 'bad', weight: ruleBad, text: `${rule.name} ${note}${flagged(c) ? `, and your scan shows ${CONCERNS[c].toLowerCase()}` : ''}` });
    }
  }

  // skincare has to earn its place with actives; makeup only has to avoid conflicts with your skin
  const base = product.kind === 'skincare' ? 62 : 76;
  // diminishing returns: piling on more actives helps less and less, so scores don't all hit the ceiling
  const gain = 36 * (1 - Math.exp(-benefit / 2.5));
  const score = Math.round(Math.min(Math.max(base + gain - harm * 16, 5), 98));
  const verdict = score >= 72 ? 'good' : score >= 50 ? 'warn' : 'bad';
  reasons.sort((a, b) => b.weight - a.weight);
  if (!reasons.length) reasons.push({ tone: 'neutral', text: 'No standout actives or common irritants for your skin.' });

  return { score, verdict, reasons: reasons.slice(0, 4), matched, targets: [...targets] };
}
