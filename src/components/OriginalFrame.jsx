import { useRef, useState } from 'react';
import CentroidMarker from './CentroidMarker.jsx';

/**
 * The untouched first frame, with the crop rectangle drawn on top and
 * draggable.
 *
 * This is the unique feature: drag on the frame to restrict the search to a
 * region of interest. It exists because "largest connected group" only finds
 * the salamander when the salamander really is the largest matching blob --
 * dark borders or a shadowed strip at the top of the frame can easily beat it.
 * It is the UI for CroppingImageGroupFinder, and it mirrors the processor's
 * --crop=X,Y,W,H flag.
 *
 * Pointer events (rather than mouse events) are used so the drag works with a
 * trackpad, a mouse, or a touchscreen through one code path. Coordinates come
 * from getBoundingClientRect and are scaled back into image pixel space, so the
 * ROI is reported in the same coordinate system the algorithm uses regardless
 * of how large the image is displayed.
 */
export default function OriginalFrame({
  src,
  width,
  height,
  centroid,
  roi,
  onRoiChange,
  onHover,
}) {
  const frameRef = useRef(null);
  const [drag, setDrag] = useState(null);

  /** Converts a pointer event into integer image-pixel coordinates. */
  const toImagePoint = (event) => {
    const rect = frameRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const y = ((event.clientY - rect.top) / rect.height) * height;
    // Clamp, so dragging past the edge selects up to the edge instead of
    // producing an out-of-bounds rectangle.
    return {
      x: Math.round(Math.min(Math.max(x, 0), width)),
      y: Math.round(Math.min(Math.max(y, 0), height)),
    };
  };

  const handlePointerDown = (event) => {
    // Capture the pointer so we keep receiving moves even if the cursor
    // leaves the image mid-drag.
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = toImagePoint(event);
    setDrag({ start, current: start });
  };

  const handlePointerMove = (event) => {
    const point = toImagePoint(event);
    // Report the pixel under the cursor so the panel can show its color. The
    // point is clamped to the frame, so the readout stays valid at the edges.
    if (onHover) {
      onHover({
        x: Math.min(point.x, width - 1),
        y: Math.min(point.y, height - 1),
      });
    }
    if (!drag) return;
    setDrag((d) => ({ ...d, current: point }));
  };

  const handlePointerUp = () => {
    if (!drag) return;
    const rect = rectFromDrag(drag);
    setDrag(null);

    // A click rather than a drag (anything under a few pixels) clears the crop
    // instead of selecting a useless sliver.
    if (rect.width < 4 || rect.height < 4) {
      onRoiChange(null);
      return;
    }
    onRoiChange(rect);
  };

  // While dragging, show the in-progress rectangle; otherwise show the committed one.
  const shown = drag ? rectFromDrag(drag) : roi;

  return (
    <div className="frame">
      <img
        src={src}
        alt="First frame of the selected video"
        className="frame-media"
        width={width}
        height={height}
        draggable={false}
      />
      <svg
        ref={frameRef}
        className="frame-overlay frame-overlay--interactive"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => onHover && onHover(null)}
        data-testid="crop-surface"
      >
        {shown && (
          <>
            {/* Dim everything outside the region, so the search area reads at a glance. */}
            <path
              d={maskPath(shown, width, height)}
              className="crop-mask"
              fillRule="evenodd"
            />
            <rect
              x={shown.x}
              y={shown.y}
              width={shown.width}
              height={shown.height}
              className="crop-rect"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
        <CentroidMarker centroid={centroid} />
      </svg>
    </div>
  );
}

/** Normalizes a drag into a positive-width rectangle, whatever direction it went. */
function rectFromDrag({ start, current }) {
  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  };
}

/**
 * An SVG path covering the whole frame with the ROI punched out of it. Two
 * subpaths plus fillRule="evenodd" gives the hole.
 */
function maskPath(rect, width, height) {
  return [
    `M0 0 H${width} V${height} H0 Z`,
    `M${rect.x} ${rect.y} H${rect.x + rect.width} V${rect.y + rect.height} H${rect.x} Z`,
  ].join(' ');
}
