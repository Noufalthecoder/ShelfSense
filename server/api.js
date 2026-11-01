// /api/* routes, mounted into the Vite dev/preview server. The YouCam key never reaches the browser.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createYouCam, YouCamError } from './youcam.js';

// SD concerns that ShelfSense's ingredient rules know how to use
const SKIN_ACTIONS = ['acne', 'age_spot', 'redness', 'oiliness', 'pore', 'moisture', 'texture', 'wrinkle'];
const MAX_UPLOAD = 10 * 1024 * 1024;
// measured: one 8-concern SD analysis costs 12 units, one makeup try-on costs 1
const SKIN_COST = 12;
const VTO_COST = 1;

// every real YouCam result is kept on disk, so the same photo is never charged twice
const CACHE_DIR = join(process.cwd(), '.cache', 'youcam');
const hash = (...parts) => createHash('sha256').update(Buffer.concat(parts.map((p) => Buffer.from(p)))).digest('hex').slice(0, 32);

async function cacheGet(key) {
  try { return JSON.parse(await readFile(join(CACHE_DIR, `${key}.json`), 'utf8')); } catch { return null; }
}
async function cacheSet(key, data) {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(join(CACHE_DIR, `${key}.json`), JSON.stringify(data));
  } catch { /* cache is best-effort */ }
}

const isCreditError = (err) => err.status === 402 || /credit|unit|quota|insufficient|balance|payment/i.test(`${err.code} ${err.message}`);

// Stand-in scores when no credits are left. Stable for the same photo, and always flagged
// `simulated` so the UI can say so.
function simulatedSkin(buffer) {
  const h = createHash('sha256').update(buffer).digest();
  const base = { acne: 82, age_spot: 80, redness: 90, oiliness: 77, pore: 74, moisture: 76, texture: 82, wrinkle: 86 };
  const scores = Object.fromEntries(Object.entries(base).map(([k, v], i) => [k, Math.min(99, v + (h[i] % 13) - 6)]));
  const vals = Object.values(scores);
  return { scores, overall: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), skinAge: 22 + (h[9] % 12), simulated: true };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_UPLOAD) {
        reject(new YouCamError('Image must be under 10 MB', 'exceed_max_filesize', 413));
        req.destroy();
      } else {
        chunks.push(c);
      }
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function parseDataUrl(s) {
  const m = /^data:(image\/(?:jpeg|png));base64,(.+)$/.exec(s ?? '');
  if (!m) throw new YouCamError('Expected a JPEG or PNG image', 'invalid_parameter', 400);
  return { type: m[1], buffer: Buffer.from(m[2], 'base64') };
}

function summarizeSkin(results) {
  const scores = {};
  let overall = null;
  let skinAge = null;
  for (const o of results?.output ?? []) {
    if (o.type === 'all') overall = Math.round(o.score);
    else if (o.type === 'skin_age') skinAge = Math.round(o.score);
    else if (typeof o.ui_score === 'number') scores[o.type] = Math.round(o.ui_score);
  }
  return { scores, overall, skinAge };
}

async function lookupProduct(code) {
  const fields = 'product_name,brands,ingredients_text,ingredients_text_en,image_front_small_url,categories_tags';
  const res = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`, {
    headers: { 'User-Agent': 'ShelfSense/0.1 (YouCam hackathon prototype)' },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const p = json.product;
  if (json.status !== 1 || !p) return null;
  const cats = (p.categories_tags ?? []).join(' ');
  return {
    code,
    name: p.product_name || 'Unnamed product',
    brand: p.brands?.split(',')[0]?.trim() || '',
    ingredients: p.ingredients_text_en || p.ingredients_text || '',
    image: p.image_front_small_url || null,
    kind: /lipstick|lip/.test(cats) ? 'lip' : /foundation/.test(cats) ? 'foundation' : 'skincare',
    source: 'Open Beauty Facts',
  };
}

export function apiMiddleware(env) {
  // YOUCAM_DEMO=1 never calls YouCam (YOUCAM_MOCK kept as an alias)
  const forceDemo = env.YOUCAM_DEMO === '1' || env.YOUCAM_MOCK === '1' || !env.YOUCAM_API_KEY;
  let client;
  const youcam = () => (client ??= createYouCam(env.YOUCAM_API_KEY));

  // the balance check is free; cache it briefly so every request doesn't ask
  let balance = { units: null, at: 0 };
  async function units() {
    if (forceDemo) return 0;
    if (Date.now() - balance.at < 30000) return balance.units;
    try {
      const r = await youcam().credit();
      balance = { units: (r.results ?? []).reduce((s, c) => s + (c.amount ?? 0), 0), at: Date.now() };
    } catch {
      balance = { units: null, at: Date.now() }; // unknown: let the real call decide
    }
    return balance.units;
  }
  const spent = (n) => { if (balance.units != null) balance.units -= n; };
  const canAfford = async (cost) => { const u = await units(); return u == null || u >= cost; };

  return async (req, res, next) => {
    const url = new URL(req.url, 'http://local');
    if (!url.pathname.startsWith('/api/')) return next();

    try {
      if (req.method === 'GET' && url.pathname === '/api/status') {
        const u = await units();
        return send(res, 200, { units: u, demo: forceDemo || (u != null && u < SKIN_COST) });
      }

      if (req.method === 'GET' && url.pathname === '/api/credit') {
        return send(res, 200, forceDemo ? { demo: true } : await youcam().credit());
      }

      if (req.method === 'POST' && url.pathname === '/api/skin-analysis') {
        const type = req.headers['content-type'];
        if (!/^image\/(jpeg|png)$/.test(type ?? '')) throw new YouCamError('Send a JPEG or PNG image', 'invalid_parameter', 400);
        const buffer = await readBody(req);

        const key = `skin-${hash(buffer, SKIN_ACTIONS.join())}`;
        const cached = await cacheGet(key);
        if (cached) return send(res, 200, { ...cached, cached: true });
        if (!(await canAfford(SKIN_COST))) return send(res, 200, simulatedSkin(buffer));

        try {
          const result = summarizeSkin(await youcam().skinAnalysis(buffer, type, SKIN_ACTIONS));
          spent(SKIN_COST);
          await cacheSet(key, result);
          return send(res, 200, result);
        } catch (err) {
          if (isCreditError(err)) return send(res, 200, simulatedSkin(buffer));
          throw err;
        }
      }

      if (req.method === 'POST' && url.pathname === '/api/makeup-vto') {
        const { image, effects } = JSON.parse((await readBody(req)).toString('utf8'));
        if (!Array.isArray(effects) || !effects.length) throw new YouCamError('No makeup effect given', 'invalid_parameter', 400);
        const { type, buffer } = parseDataUrl(image);

        const key = `vto-${hash(buffer, JSON.stringify(effects))}`;
        const cached = await cacheGet(key);
        if (cached) return send(res, 200, { ...cached, cached: true });
        const noCredits = new YouCamError('Live try-on needs YouCam credits.', 'no_credits', 402);
        if (!(await canAfford(VTO_COST))) throw noCredits;

        let resultUrl;
        try {
          resultUrl = await youcam().makeupVto(buffer, type, effects);
        } catch (err) {
          throw isCreditError(err) ? noCredits : err;
        }
        spent(VTO_COST);
        // result links expire after ~2 hours, so hand the image itself to the browser
        const img = await fetch(resultUrl);
        if (!img.ok) throw new YouCamError('Could not download the try-on image', 'vto_download_failed', 502);
        const bytes = Buffer.from(await img.arrayBuffer());
        const result = { image: `data:${img.headers.get('content-type') || 'image/jpeg'};base64,${bytes.toString('base64')}` };
        await cacheSet(key, result);
        return send(res, 200, result);
      }

      const productMatch = /^\/api\/product\/(\d{6,14})$/.exec(url.pathname);
      if (req.method === 'GET' && productMatch) {
        const product = await lookupProduct(productMatch[1]);
        return product ? send(res, 200, product) : send(res, 404, { error: 'Product not found', error_code: 'not_found' });
      }

      send(res, 404, { error: 'Unknown API route', error_code: 'not_found' });
    } catch (err) {
      const status = err instanceof YouCamError ? err.status : 500;
      send(res, status, { error: err.message, error_code: err.code ?? 'internal_error' });
    }
  };
}
