import { useEffect, useRef, useState } from 'react';
import { analyzeImageData } from '../lib/pipeline.js';
import { parseHexColor } from '../lib/euclideanColorDistance.js';

/**
 * Runs the ported Java pipeline over a frame whenever the tuning settings
 * change, and reports the resulting binary image plus the groups it found.
 *
 * Two things keep this feeling live rather than janky:
 *
 *  1. The work is deferred to requestAnimationFrame. Dragging a slider fires
 *     many change events per second; without this, each one would binarize the
 *     whole frame synchronously inside the event handler and the slider would
 *     stutter. Scheduling one run per frame coalesces the bursts, and any run
 *     still pending when the settings change again is cancelled.
 *
 *  2. A `generation` ref makes stale results impossible to apply: a result is
 *     only committed if no newer run has started since.
 *
 * At 320x240 the whole pipeline is well under a frame's budget, so the preview
 * tracks the slider in real time.
 *
 * @param {?ImageData} imageData the frame to analyze
 * @param {string} targetColorHex "#rrggbb" from the color picker
 * @param {number} threshold distance cutoff from the slider
 * @param {?{x,y,width,height}} roi optional region of interest
 */
export function useBinarization(imageData, targetColorHex, threshold, roi) {
  const [result, setResult] = useState({ binary: null, groups: [], largest: null });
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState(null);
  const generation = useRef(0);

  useEffect(() => {
    if (!imageData) {
      setResult({ binary: null, groups: [], largest: null });
      return;
    }

    const runId = ++generation.current;
    setComputing(true);

    const handle = requestAnimationFrame(() => {
      try {
        const targetColor = parseHexColor(targetColorHex);
        const next = analyzeImageData(imageData, targetColor, threshold, roi);

        // Discard if a newer run has already started.
        if (generation.current !== runId) return;
        setResult(next);
        setError(null);
      } catch (e) {
        if (generation.current !== runId) return;
        setError(e.message);
      } finally {
        if (generation.current === runId) setComputing(false);
      }
    });

    return () => cancelAnimationFrame(handle);
    // roi is an object; the page memoizes it so this does not re-run on every
    // render just because a fresh object was created.
  }, [imageData, targetColorHex, threshold, roi]);

  return { ...result, computing, error };
}
