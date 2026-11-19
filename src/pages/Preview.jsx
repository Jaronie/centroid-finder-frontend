import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import { thumbnailUrl } from '../api.js';
import { analyzeFrame } from '../utils/pipeline.js';
import FrameOverlay from '../components/FrameOverlay.jsx';
import JobPanel from '../components/JobPanel.jsx';
import { useJob } from '../hooks/useJob.js';

export default function Preview() {
  const { filename } = useParams();
  const url = useMemo(() => thumbnailUrl(filename), [filename]);

  const [color, setColor] = useState('#e53935');
  const [threshold, setThreshold] = useState(120);

  // Load state is stored together with the url it belongs to, and the status
  // is derived during render. Resetting to 'loading' by calling setStatus at
  // the top of the load effect would be a synchronous setState inside an
  // effect, which triggers a cascading re-render (and react-hooks flags it);
  // deriving it means switching videos shows 'loading' on the very first
  // render, with no extra pass.
  const [load, setLoad] = useState({ url: null, status: 'loading' });
  const status = load.url === url ? load.status : 'loading';

  // Crop region, in frame pixels. null means "search the whole frame".
  // Also keyed by url, so picking a different video drops the old region
  // without another setState in an effect.
  const [roiState, setRoiState] = useState({ url: null, roi: null });
  const roi = roiState.url === url ? roiState.roi : null;
  const setRoi = (next) => setRoiState({ url, roi: next });
  // What the detector found on the current settings.
  const [result, setResult] = useState({ groups: [], largest: null });
  // Frame size, kept in state (not just the ref) so the overlays can size
  // themselves once the image has loaded.
  const [dims, setDims] = useState({ width: 0, height: 0 });

  const canvasRef = useRef(null);
  const sourceRef = useRef(null); // original ImageData, captured once per video

  // Steps 4 and 5: submit the job and poll it to completion.
  const job = useJob(filename);

  // Load the thumbnail and capture its pixels.
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const off = document.createElement('canvas');
      off.width = img.naturalWidth;
      off.height = img.naturalHeight;
      const ctx = off.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      sourceRef.current = ctx.getImageData(0, 0, off.width, off.height);
      setDims({ width: off.width, height: off.height });
      setLoad({ url, status: 'ready' });
    };
    img.onerror = () => setLoad({ url, status: 'error' });
    img.src = url;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  // Re-binarize whenever the settings change, and find the connected groups.
  //
  // The work is deferred to a requestAnimationFrame: dragging the slider fires
  // many change events per second, and without this each one would binarize
  // and search the whole frame synchronously inside the event handler. One run
  // per frame coalesces the bursts, and a pending run is cancelled when the
  // settings change again.
  useEffect(() => {
    if (status !== 'ready') return;
    const src = sourceRef.current;

    const handle = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = src.width;
      canvas.height = src.height;

      const { rgba, groups, largest } = analyzeFrame(src, color, threshold, roi);
      canvas
        .getContext('2d')
        .putImageData(new ImageData(rgba, src.width, src.height), 0, 0);

      setResult({ groups, largest });
    });

    return () => cancelAnimationFrame(handle);
  }, [status, color, threshold, roi]);

  const { groups, largest } = result;

  return (
    <Stack spacing={3}>
      <Box>
        <Button component={Link} to="/videos">← Back to videos</Button>
      </Box>
      <Typography variant="h4">{filename}</Typography>

      {status === 'loading' && <CircularProgress />}
      {status === 'error' && <Alert severity="error">Could not load the thumbnail.</Alert>}
      {status === 'ready' && (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Box>
            <Stack
              direction="row"
              sx={{
                width: '100%',
                mb: 0.5,
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <Typography variant="subtitle1">Original</Typography>
              <Typography variant="caption" color="text.secondary">
                drag to set a search region
              </Typography>
            </Stack>
            {/* position: relative establishes the box the overlay is pinned to. */}
            <Box sx={{ position: 'relative', lineHeight: 0 }}>
              <img src={url} alt={`First frame of ${filename}`} style={{ width: '100%' }} />
              <FrameOverlay
                width={dims.width}
                height={dims.height}
                centroid={largest?.centroid}
                roi={roi}
                onRoiChange={setRoi}
                interactive
              />
            </Box>
          </Box>
          <Box>
            <Stack
              direction="row"
              sx={{
                width: '100%',
                mb: 0.5,
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <Typography variant="subtitle1">Binarized</Typography>
              <Typography variant="caption" color="text.secondary">
                updates live
              </Typography>
            </Stack>
            <Box sx={{ position: 'relative', lineHeight: 0 }}>
              <canvas
                ref={canvasRef}
                style={{ width: '100%', imageRendering: 'pixelated' }}
                data-testid="binarized-canvas"
              />
              <FrameOverlay
                width={dims.width}
                height={dims.height}
                centroid={largest?.centroid}
              />
            </Box>
          </Box>
        </Box>
      )}

      <Stack spacing={1} sx={{ maxWidth: 480 }}>
        <label>
          Target color{' '}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            data-testid="color-picker"
          />
        </label>
        <Typography id="threshold-label">Threshold: {threshold}</Typography>
        <Slider
          aria-labelledby="threshold-label"
          min={0}
          max={442}
          value={threshold}
          onChange={(_, v) => setThreshold(v)}
          data-testid="threshold-slider"
        />
        <Typography variant="caption" color="text.secondary">
          A pixel turns white when its distance to the target color is strictly
          less than this. 0 gives an all-black image; 442 is past the largest
          possible RGB distance, so everything matches.
        </Typography>
      </Stack>

      {status === 'ready' && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="h6" gutterBottom>
            Largest connected group
          </Typography>

          <Stack
            direction="row"
            spacing={4}
            useFlexGap
            sx={{ flexWrap: 'wrap' }}
            data-testid="stats"
          >
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                GROUPS FOUND
              </Typography>
              <Typography variant="h6">{groups.length}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                LARGEST GROUP SIZE
              </Typography>
              <Typography variant="h6">{largest ? `${largest.size} px` : '--'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                CENTROID
              </Typography>
              <Typography variant="h6" data-testid="centroid">
                {largest ? `(${largest.centroid.x}, ${largest.centroid.y})` : 'no match'}
              </Typography>
            </Box>
          </Stack>

          {/* The unique feature's readout and reset. */}
          <Stack
            direction="row"
            spacing={2}
            useFlexGap
            sx={{
              mt: 2.5,
              pt: 2,
              borderTop: 1,
              borderColor: 'divider',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {roi ? (
              <>
                <Chip
                  size="small"
                  label={`Search region: x=${roi.x} y=${roi.y} w=${roi.width} h=${roi.height}`}
                />
                <Button size="small" onClick={() => setRoi(null)} data-testid="clear-roi">
                  Clear region
                </Button>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Searching the whole frame. Drag a rectangle on the original to
                ignore dark borders that out-size the salamander.
              </Typography>
            )}
          </Stack>
        </Paper>
      )}

      <JobPanel
        {...job}
        onSubmit={job.submit}
        onReset={job.reset}
        disabled={status !== 'ready'}
        targetColor={color}
        threshold={threshold}
        roi={roi}
      />
    </Stack>
  );
}
