import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Slider, Stack, Typography } from '@mui/material';
import { thumbnailUrl } from '../api.js';
import { binarizePixels } from '../utils/binarize.js';

export default function Preview() {
  const { filename } = useParams();
  const url = useMemo(() => thumbnailUrl(filename), [filename]);

  const [color, setColor] = useState('#e53935');
  const [threshold, setThreshold] = useState(120);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const canvasRef = useRef(null);
  const sourceRef = useRef(null); // original ImageData, captured once per video

  // Load the thumbnail and capture its pixels.
  useEffect(() => {
    setStatus('loading');
    const img = new Image();
    img.onload = () => {
      const off = document.createElement('canvas');
      off.width = img.naturalWidth;
      off.height = img.naturalHeight;
      const ctx = off.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      sourceRef.current = ctx.getImageData(0, 0, off.width, off.height);
      setStatus('ready');
    };
    img.onerror = () => setStatus('error');
    img.src = url;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  // Re-binarize whenever the settings change.
  useEffect(() => {
    if (status !== 'ready') return;
    const src = sourceRef.current;
    const canvas = canvasRef.current;
    canvas.width = src.width;
    canvas.height = src.height;
    const out = binarizePixels(src.data, color, threshold);
    canvas.getContext('2d').putImageData(new ImageData(out, src.width, src.height), 0, 0);
  }, [status, color, threshold]);

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
            <Typography variant="subtitle1">Original</Typography>
            <img src={url} alt={`First frame of ${filename}`} style={{ width: '100%' }} />
          </Box>
          <Box>
            <Typography variant="subtitle1">Binarized</Typography>
            <canvas ref={canvasRef} style={{ width: '100%' }} />
          </Box>
        </Box>
      )}

      <Stack spacing={1} sx={{ maxWidth: 480 }}>
        <label>
          Target color{' '}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <Typography id="threshold-label">Threshold: {threshold}</Typography>
        <Slider
          aria-labelledby="threshold-label"
          min={0}
          max={442}
          value={threshold}
          onChange={(_, v) => setThreshold(v)}
        />
      </Stack>
    </Stack>
  );
}