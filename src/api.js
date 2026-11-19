const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchVideos() {
  if (USE_MOCKS) {
    await delay(400);
    return ['demo.mov', 'ensantina.mp4', 'intro.mp4'];
  }
  const res = await fetch('/api/videos');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export function thumbnailUrl(filename) {
  return USE_MOCKS ? mockThumbnail() : `/thumbnail/${encodeURIComponent(filename)}`;
}

// A dark frame with a red circle and a green square, so you can test color matching.
function mockThumbnail() {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 360;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1b2a3a';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#e53935';
  ctx.beginPath();
  ctx.arc(220, 180, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#43a047';
  ctx.fillRect(380, 110, 140, 140);
  return c.toDataURL('image/jpeg');
}
// ---------------------------------------------------------------------------
// Job submission and tracking (steps 4 and 5).
//
//   POST /process/{filename}?targetColor=<hex>&threshold=<int>
//        -> 202 {"jobId": "..."}
//   GET  /process/{jobId}/status
//        -> {"status":"processing"}
//         | {"status":"done","result":"/results/intro.mp4.csv"}
//         | {"status":"error","error":"..."}
//
// Errors come back as {"error": "message"}, same as fetchVideos above.
// ---------------------------------------------------------------------------

/** In-memory job table for mock mode, standing in for the server's map. */
const mockJobs = new Map();
const MOCK_JOB_MS = 4000;

/**
 * Starts a processing job and returns its id.
 *
 * targetColor must be BARE six-digit hex with NO leading "#". The server
 * rejects a "#" with a 400, because the processor calls
 * Integer.parseInt(hex, 16) on it. <input type="color"> always produces
 * "#rrggbb", so the "#" is stripped here where no caller can forget.
 */
export async function startJob(filename, targetColor, threshold) {
  const hex = String(targetColor).replace(/^#/, '');
  const value = Math.trunc(threshold);

  if (USE_MOCKS) {
    await delay(300);
    const jobId = `mock-${crypto.randomUUID()}`;
    mockJobs.set(jobId, { filename, startedAt: Date.now() });
    return jobId;
  }

  const params = new URLSearchParams({ targetColor: hex, threshold: String(value) });
  const res = await fetch(`/process/${encodeURIComponent(filename)}?${params}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  const body = await res.json();
  return body.jobId;
}

/**
 * Reads a job's current status. An unknown id is a 404 -- job state lives in
 * memory on the server, so a restart loses it.
 */
export async function fetchJobStatus(jobId) {
  if (USE_MOCKS) {
    await delay(200);
    const job = mockJobs.get(jobId);
    if (!job) throw new Error('Job ID not found');
    if (Date.now() - job.startedAt < MOCK_JOB_MS) return { status: 'processing' };
    return { status: 'done', result: `/results/${job.filename}.csv` };
  }

  const res = await fetch(`/process/${encodeURIComponent(jobId)}/status`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}
