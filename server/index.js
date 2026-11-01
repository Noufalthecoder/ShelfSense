// Production server: serves the built site from dist/ and the same /api routes as the dev server.
// Run `npm run build` first, then `npm start`. Reads YOUCAM_API_KEY (and friends) from the environment.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { apiMiddleware } from './api.js';

// local convenience: pick up .env.local when it exists (hosts set real env vars instead)
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const DIST = join(process.cwd(), 'dist');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json',
  '.woff2': 'font/woff2', '.txt': 'text/plain',
};

// paid YouCam routes are rate-limited per visitor, so a public link can't drain the credits
const LIMIT = Number(process.env.PAID_LIMIT_PER_HOUR) || 8;
const hits = new Map();
function limited(req) {
  const ip = (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket.remoteAddress;
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600e3);
  if (recent.length >= LIMIT) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}
setInterval(() => { const now = Date.now(); for (const [ip, ts] of hits) if (ts.every((t) => now - t > 3600e3)) hits.delete(ip); }, 600e3).unref();

const api = apiMiddleware(process.env);

async function serveStatic(req, res) {
  const path = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  let file = normalize(join(DIST, path));
  if (!file.startsWith(DIST)) { res.statusCode = 403; return res.end(); }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    // client-side routes such as /app fall back to the single page; missing files stay 404
    if (extname(path)) { res.statusCode = 404; return res.end('Not found'); }
    file = join(DIST, 'index.html');
  }
  try {
    const body = await readFile(file);
    res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', file.includes(`${join('dist', 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}

createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=()');
  if (req.method === 'POST' && /^\/api\/(skin-analysis|makeup-vto)$/.test(req.url.split('?')[0]) && limited(req)) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'You have used this demo a lot in the last hour. Please try again a bit later.', error_code: 'rate_limited' }));
  }
  api(req, res, () => serveStatic(req, res));
}).listen(PORT, () => {
  console.log(`ShelfSense running on http://localhost:${PORT}`);
  if (!process.env.YOUCAM_API_KEY) console.log('No YOUCAM_API_KEY set: running in labelled demo mode.');
});
