import { useCallback, useEffect, useRef, useState } from 'react';
import { startJob, fetchJobStatus, ApiError } from '../api/client.js';

/** How often to ask the server for job status. */
const POLL_INTERVAL_MS = 1000;

/**
 * Submits a processing job and tracks it to completion.
 *
 * This is steps 4 and 5 together, because they are one lifecycle: POST
 * /process/{filename} answers 202 with a jobId, and that jobId is the only
 * handle we have for polling GET /process/{jobId}/status until it reports
 * done or error.
 *
 * Polling, not a socket, is what the API offers -- so the interval is set up in
 * an effect keyed on the jobId and the current status. It starts when a jobId
 * exists, and the effect's cleanup clears it the moment the status stops being
 * "processing" or the component unmounts. That is what stops a finished job
 * from polling forever in the background.
 *
 * @param {string} filename the video to process
 */
export function useJob(filename) {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null); // 'processing' | 'done' | 'error'
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(null);

  /** Step 4: submit the job with the settings currently on screen. */
  const submit = useCallback(
    async (targetColor, threshold) => {
      setSubmitting(true);
      setError(null);
      setResultUrl(null);
      setStatus(null);
      setElapsed(0);

      try {
        const id = await startJob(filename, targetColor, threshold);
        startedAt.current = Date.now();
        setJobId(id);
        // The server has accepted the work (202) but not finished it.
        setStatus('processing');
      } catch (e) {
        setError(
          e instanceof ApiError
            ? e.message
            : `Could not reach the server: ${e.message}`
        );
        setStatus('error');
      } finally {
        setSubmitting(false);
      }
    },
    [filename]
  );

  /** Step 5: poll status while the job is running. */
  useEffect(() => {
    if (!jobId || status !== 'processing') return;

    let cancelled = false;
    const controller = new AbortController();

    const poll = async () => {
      try {
        const body = await fetchJobStatus(jobId, { signal: controller.signal });
        if (cancelled) return;

        if (body.status === 'done') {
          setStatus('done');
          setResultUrl(body.result);
        } else if (body.status === 'error') {
          setStatus('error');
          setError(body.error || 'The server reported an error.');
        }
        // 'processing' -> leave state alone and let the interval fire again.
      } catch (e) {
        if (cancelled || e.name === 'AbortError') return;
        // A 404 means the job id is gone -- the server keeps job state in
        // memory, so a restart loses it. Stop polling and say so.
        setStatus('error');
        setError(
          e.status === 404 || e instanceof ApiError
            ? e.message
            : `Lost contact with the server: ${e.message}`
        );
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    const ticker = setInterval(() => {
      if (startedAt.current) {
        setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
      }
    }, 1000);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
      clearInterval(ticker);
    };
  }, [jobId, status]);

  const reset = useCallback(() => {
    setJobId(null);
    setStatus(null);
    setResultUrl(null);
    setError(null);
    setElapsed(0);
    startedAt.current = null;
  }, []);

  return { jobId, status, resultUrl, error, submitting, elapsed, submit, reset };
}
