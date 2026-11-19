/**
 * The only place in the app that talks HTTP.
 *
 * Every function here calls the real Spring Boot backend. URLs are relative,
 * so the browser requests them from the Vite dev server, which proxies them to
 * http://localhost:8081 (see vite.config.js). That keeps the real API as the
 * default path and means no CORS configuration is needed on the Java side.
 *
 * Mock mode is a development fallback ONLY, for working on the UI while the
 * backend is down. It is OFF unless you explicitly turn it on:
 *
 *     VITE_USE_MOCKS=true npm run dev
 *
 * The real API contract (from the server's controllers):
 *   GET  /api/videos                  -> 200 ["intro.mp4", "demo.mov"]
 *   GET  /thumbnail/{filename}        -> 200 image/jpeg bytes
 *   POST /process/{filename}?targetColor=<hex>&threshold=<int>
 *                                     -> 202 {"jobId": "..."}
 *   GET  /process/{jobId}/status      -> 200 {"status":"processing"}
 *                                          | {"status":"done","result":"/results/x.csv"}
 *                                          | {"status":"error","error":"..."}
 * Errors come back as {"error": "message"}.
 */
import * as mocks from '../mock/mockApi.js';

export const USE_MOCKS = import.meta.env?.VITE_USE_MOCKS === 'true';

/**
 * Shared error type so the UI can show the backend's own message rather than a
 * generic "request failed".
 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Reads the backend's {"error": "..."} body when a response is not ok.
 * Falls back to the status text if the body is not JSON (a proxy error page,
 * for instance).
 */
async function throwForStatus(res) {
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    if (body && body.error) message = body.error;
  } catch {
    // Not JSON -- keep the status line.
  }
  throw new ApiError(message, res.status);
}

/**
 * GET /api/videos -- the list for the Video Chooser page.
 * An empty directory is not an error; it is a legitimate [].
 *
 * @param {{signal?: AbortSignal}} options
 * @returns {Promise<string[]>} filenames
 */
export async function fetchVideos({ signal } = {}) {
  if (USE_MOCKS) return mocks.fetchVideos();

  const res = await fetch('/api/videos', { signal });
  if (!res.ok) await throwForStatus(res);
  return res.json();
}

/**
 * The URL for a video's first frame. This is used as an <img>/Image src rather
 * than fetched directly, because the endpoint returns raw JPEG bytes and the
 * browser decodes them for us -- which is what we need before we can read
 * pixels off a canvas.
 */
export function thumbnailUrl(filename) {
  if (USE_MOCKS) return mocks.thumbnailUrl(filename);
  return `/thumbnail/${encodeURIComponent(filename)}`;
}

/** The URL for the source video itself, served statically at /videos/**. */
export function videoUrl(filename) {
  return `/videos/${encodeURIComponent(filename)}`;
}

/**
 * POST /process/{filename}?targetColor=<hex>&threshold=<int>
 *
 * Returns 202 Accepted with a jobId -- the work has been taken, not finished.
 *
 * targetColor must be BARE six-digit hex with NO leading "#". The server
 * rejects a "#" with a 400 because the processor calls Integer.parseInt(hex,
 * 16) on it. <input type="color"> always produces "#rrggbb", so stripping it is
 * mandatory and happens here so no caller can forget.
 *
 * @param {string} filename
 * @param {string} targetColor "#rrggbb" or "rrggbb"
 * @param {number} threshold non-negative integer
 * @returns {Promise<string>} the jobId
 */
export async function startJob(filename, targetColor, threshold) {
  const hex = String(targetColor).replace(/^#/, '');
  const params = new URLSearchParams({
    targetColor: hex,
    threshold: String(Math.trunc(threshold)),
  });

  if (USE_MOCKS) return mocks.startJob(filename, hex, threshold);

  const res = await fetch(
    `/process/${encodeURIComponent(filename)}?${params}`,
    { method: 'POST' }
  );
  if (!res.ok) await throwForStatus(res);
  const body = await res.json();
  return body.jobId;
}

/**
 * GET /process/{jobId}/status
 *
 * One of three shapes:
 *   {status: "processing"}
 *   {status: "done",  result: "/results/intro.mp4.csv"}
 *   {status: "error", error: "..."}
 *
 * An unknown or expired jobId is a 404 (job state lives in memory on the
 * server, so a restart loses it).
 */
export async function fetchJobStatus(jobId, { signal } = {}) {
  if (USE_MOCKS) return mocks.fetchJobStatus(jobId);

  const res = await fetch(`/process/${encodeURIComponent(jobId)}/status`, {
    signal,
  });
  if (!res.ok) await throwForStatus(res);
  return res.json();
}
