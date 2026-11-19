import { useEffect, useRef } from 'react';
import { toImageData } from '../lib/distanceImageBinarizer.js';
import CentroidMarker from './CentroidMarker.jsx';

/**
 * Draws the binary array as an actual black-and-white image.
 *
 * The binary array is painted at its true pixel size onto a canvas, then CSS
 * scales the canvas up to fit the layout. image-rendering: pixelated (in the
 * stylesheet) keeps that scaling crisp instead of blurring the 1-pixel detail
 * that matters when you are tuning a threshold.
 *
 * Writing pixels goes through the ported toImageData, the same function the
 * Mocha tests cover, so what you see is exactly what the algorithm produced.
 */
export default function BinarizedCanvas({ binary, width, height, centroid }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !binary) return;

    const ctx = canvas.getContext('2d');
    const imageData = toImageData(binary, (w, h) => ctx.createImageData(w, h));
    ctx.putImageData(imageData, 0, 0);
  }, [binary]);

  return (
    <div className="frame">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="frame-media"
        data-testid="binarized-canvas"
      />
      <svg
        className="frame-overlay"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <CentroidMarker centroid={centroid} />
      </svg>
    </div>
  );
}
