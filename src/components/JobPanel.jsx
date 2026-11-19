/**
 * Steps 4 and 5: submit the job, then show its progress and the finished CSV.
 *
 * The submit button is disabled while a job is in flight so the same settings
 * cannot be queued twice by an impatient double-click.
 *
 * Progress is genuinely unknowable here -- the status endpoint reports only
 * processing/done/error, with no percentage -- so this shows an indeterminate
 * bar and a live elapsed-seconds count rather than inventing a percentage.
 */
export default function JobPanel({
  jobId,
  status,
  resultUrl,
  error,
  submitting,
  elapsed,
  onSubmit,
  onReset,
  disabled,
  targetColor,
  threshold,
  roi,
}) {
  const running = status === 'processing';

  return (
    <section className="card job-panel">
      <h2>Process video</h2>

      <p className="job-summary">
        Sends <code>threshold={threshold}</code> and{' '}
        <code>targetColor={targetColor.replace(/^#/, '').toUpperCase()}</code> to
        the backend, which runs the detector over every frame and writes a CSV.
        {roi && (
          <>
            {' '}
            <span className="job-note">
              Note: the crop region is a preview-only aid -- the backend
              processes the full frame.
            </span>
          </>
        )}
      </p>

      <div className="job-actions">
        <button
          type="button"
          className="primary"
          onClick={() => onSubmit(targetColor, threshold)}
          disabled={disabled || submitting || running}
          data-testid="process-button"
        >
          {submitting
            ? 'Submitting...'
            : running
              ? 'Processing...'
              : 'Process Video with These Settings'}
        </button>

        {(status === 'done' || status === 'error') && (
          <button type="button" className="secondary" onClick={onReset}>
            Start another
          </button>
        )}
      </div>

      {status && (
        <div className="job-status" data-testid="job-status">
          <div className="job-status-head">
            <span className={`badge badge--${status}`}>{status}</span>
            {jobId && (
              <code className="job-id" title="Job ID returned by the API">
                {jobId}
              </code>
            )}
            {running && <span className="job-elapsed">{elapsed}s</span>}
          </div>

          {running && (
            <div
              className="progress"
              role="progressbar"
              aria-label="Processing video"
            >
              <div className="progress-bar" />
            </div>
          )}

          {status === 'done' && resultUrl && (
            <div className="job-result">
              <p>Finished. The results are ready:</p>
              <a
                className="csv-link"
                href={resultUrl}
                download
                data-testid="csv-link"
              >
                Download CSV
              </a>
              <code className="result-path">{resultUrl}</code>
              <p className="control-hint">
                One row per frame, as <code>seconds,x,y</code>. A row of{' '}
                <code>-1,-1</code> means nothing matched in that frame.
              </p>
            </div>
          )}

          {status === 'error' && (
            <p className="error" data-testid="job-error">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
