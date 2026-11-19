import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

/**
 * Steps 4 and 5: submit the job, then show its progress and the finished CSV.
 *
 * The button is disabled while a job is in flight, so the same settings cannot
 * be queued twice by an impatient double-click.
 *
 * Progress is genuinely unknowable here -- the status endpoint reports only
 * processing/done/error, with no percentage -- so this shows an indeterminate
 * bar and a live elapsed count rather than inventing one.
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
  const hex = targetColor.replace(/^#/, '').toUpperCase();

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="h6" gutterBottom>
        Process video
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Sends <code>threshold={threshold}</code> and <code>targetColor={hex}</code> to
        the backend, which runs the detector over every frame and writes a CSV.
        {roi && (
          <Box component="span" sx={{ color: 'warning.main' }}>
            {' '}
            Note: the crop region is a preview-only aid -- the backend processes
            the full frame.
          </Box>
        )}
      </Typography>

      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={() => onSubmit(targetColor, threshold)}
          disabled={disabled || submitting || running}
          data-testid="process-button"
        >
          {submitting
            ? 'Submitting...'
            : running
              ? 'Processing...'
              : 'Process Video with These Settings'}
        </Button>

        {(status === 'done' || status === 'error') && (
          <Button variant="outlined" onClick={onReset}>
            Start another
          </Button>
        )}
      </Stack>

      {status && (
        <Box sx={{ mt: 2.5 }} data-testid="job-status">
          <Stack
            direction="row"
            spacing={1.5}
            useFlexGap
            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Chip
              size="small"
              label={status}
              color={
                status === 'done' ? 'success' : status === 'error' ? 'error' : 'warning'
              }
            />
            {jobId && (
              <Typography variant="caption" color="text.secondary" component="code">
                {jobId}
              </Typography>
            )}
            {running && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                {elapsed}s
              </Typography>
            )}
          </Stack>

          {running && <LinearProgress sx={{ mt: 1.5 }} />}

          {status === 'done' && resultUrl && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Finished. The results are ready:
              </Typography>
              <Stack
            direction="row"
            spacing={1.5}
            useFlexGap
            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          >
                <Button
                  variant="outlined"
                  component={MuiLink}
                  href={resultUrl}
                  download
                  data-testid="csv-link"
                >
                  Download CSV
                </Button>
                <Typography variant="caption" color="text.secondary" component="code">
                  {resultUrl}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                One row per frame, as <code>seconds,x,y</code>. A row of{' '}
                <code>-1,-1</code> means nothing matched in that frame.
              </Typography>
            </Box>
          )}

          {status === 'error' && (
            <Alert severity="error" sx={{ mt: 1.5 }} data-testid="job-error">
              {error}
            </Alert>
          )}
        </Box>
      )}
    </Paper>
  );
}
