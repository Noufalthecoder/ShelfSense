// Minimal YouCam API v2 client: upload to a pre-signed URL, create a task, poll it.
const BASE = 'https://yce-api-01.makeupar.com';
const POLL_MS = 2000;
const TIMEOUT_MS = 180000;

export class YouCamError extends Error {
  constructor(message, code, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createYouCam(apiKey) {
  if (!apiKey) throw new YouCamError('YOUCAM_API_KEY is not set in .env.local', 'missing_key', 500);

  async function call(path, { method = 'GET', body } = {}) {
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(BASE + path, {
        method,
        headers: { Authorization: `Bearer ${apiKey}`, ...(body && { 'Content-Type': 'application/json' }) },
        body: body && JSON.stringify(body),
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = { error: text }; }
      if (res.status === 429 && attempt <= 4) {
        await sleep(1500 * attempt);
        continue;
      }
      if (!res.ok) throw new YouCamError(json.error || `YouCam HTTP ${res.status}`, json.error_code || `http_${res.status}`, res.status);
      return json;
    }
  }

  async function upload(feature, buffer, contentType) {
    const ext = contentType === 'image/png' ? 'png' : 'jpg';
    const reg = await call(`/s2s/v2.0/file/${feature}`, {
      method: 'POST',
      body: { files: [{ content_type: contentType, file_name: `selfie.${ext}`, file_size: buffer.length }] },
    });
    const file = reg.data?.files?.[0];
    const req = file?.requests?.[0];
    if (!file?.file_id || !req?.url) throw new YouCamError('Upload registration failed', 'upload_failed', 502);

    // fetch sets Content-Length itself from the buffer
    const headers = Object.fromEntries(Object.entries(req.headers ?? { 'Content-Type': contentType })
      .filter(([k]) => k.toLowerCase() !== 'content-length'));
    const put = await fetch(req.url, { method: req.method || 'PUT', headers, body: buffer });
    if (!put.ok) throw new YouCamError(`Image upload failed (${put.status})`, 'upload_failed', 502);
    return file.file_id;
  }

  async function runTask(feature, body) {
    const created = await call(`/s2s/v2.0/task/${feature}`, { method: 'POST', body });
    const taskId = created.data?.task_id;
    if (!taskId) throw new YouCamError('Task was not created', 'task_failed', 502);

    const started = Date.now();
    while (Date.now() - started < TIMEOUT_MS) {
      await sleep(POLL_MS);
      const { data } = await call(`/s2s/v2.0/task/${feature}/${encodeURIComponent(taskId)}`);
      if (data?.task_status === 'success') return data;
      if (data?.task_status === 'error') throw new YouCamError(data.error_message || data.error || 'Analysis failed', data.error || 'task_error', 422);
    }
    throw new YouCamError('YouCam took too long to respond', 'poll_timeout', 504);
  }

  return {
    credit: () => call('/s2s/v1.0/client/credit'),

    async skinAnalysis(buffer, contentType, actions) {
      const fileId = await upload('skin-analysis', buffer, contentType);
      const data = await runTask('skin-analysis', {
        src_file_id: fileId,
        dst_actions: actions,
        miniserver_args: { enable_mask_overlay: false },
        format: 'json',
      });
      return data.results;
    },

    async makeupVto(buffer, contentType, effects) {
      const fileId = await upload('makeup-vto', buffer, contentType);
      const data = await runTask('makeup-vto', { src_file_id: fileId, effects, version: '1.0' });
      const r = data.results;
      const url = r?.url ?? r?.[0]?.download_url ?? r?.[0]?.url;
      if (!url) throw new YouCamError('Try-on returned no image', 'vto_no_result', 502);
      return url;
    },
  };
}
