/**
 * Fake implementations of the API functions, used only when
 * VITE_USE_MOCKS=true. Each one mimics the real endpoint's response shape and
 * adds a small delay, so loading states and polling behave as they do against
 * the live server.
 */
import { mockVideoList, mockThumbnail, mockResultUrl } from './videos.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** In-memory job table, standing in for the server's ConcurrentHashMap. */
const jobs = new Map();

/** How long a mock job "runs" before reporting done. */
const MOCK_JOB_MS = 4000;

export async function fetchVideos() {
  await delay(300);
  return [...mockVideoList];
}

export function thumbnailUrl() {
  // Every mock video shows the same real sample frame.
  return mockThumbnail;
}

export async function startJob(filename) {
  await delay(300);
  const jobId = `mock-${crypto.randomUUID()}`;
  jobs.set(jobId, { filename, startedAt: Date.now() });
  return jobId;
}

export async function fetchJobStatus(jobId) {
  await delay(200);
  const job = jobs.get(jobId);

  // Matches the real 404 for an id that was never issued.
  if (!job) {
    const error = new Error('Job ID not found');
    error.status = 404;
    throw error;
  }

  if (Date.now() - job.startedAt < MOCK_JOB_MS) {
    return { status: 'processing' };
  }
  return { status: 'done', result: mockResultUrl(job.filename) };
}
