import { useRef, useState } from 'react';
import CentroidMarker from './CentroidMarker.jsx';

/**
 * A transparent SVG laid over a frame, drawing the centroid dot and -- when
 * interactive -- the draggable crop rectangle.
 *
 * The viewBox is the frame's pixel dimensions, so the coordinates the
 * algorithm produced are used verbatim, with no scaling math, and everything
 * stays aligned however CSS sizes the image.
 *
 * Pointer events (rather than mouse events) are used so the drag works with a
 * trackpad, a mouse, or a touchscreen through one code path.
 */
export default function FrameOverlay({
  width,
  height,
  centroid,
  roi,
  onRoiChange,
  interactive = false,
}) {
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null);

  /** Converts a pointer event into integer image-pixel coordinates. */
  const toImagePoint = (event) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const y = ((event.clientY - rect.top) / rect.height) * height;
    // Clamped, so dragging past the edge selects up to the edge rather than
    // producing an out-of-bounds rectangle.
    return {
      x: Math.round(Math.min(Math.max(x, 0), width)),
      y: Math.round(Math.min(Math.max(y, 0), height)),
    };
  };

  const handlePointerDown = (event) => {
    if (!interactive) return;
    // Capture the pointer so moves keep arriving if the cursor leaves the
    // image mid-drag.
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = toImagePoint(event);
    setDrag({ start, current: start });
  };

  const handlePointerMove = (event) => {
    if (!interactive || !drag) return;
    setDrag((d) => ({ ...d, current: toImagePoint(event) }));
  };

  const handlePointerUp = () => {
    if (!interactive || !drag) return;
    const rect = rectFromDrag(drag);
    setDrag(null);

    // A click rather than a drag clears the region instead of selecting a
    // useless sliver.
    onRoiChange(rect.width < 4 || rect.height < 4 ? null : rect);
  };

  const shown = drag ? rectFromDrag(drag) : roi;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-testid={interactive ? 'crop-surface' : undefined}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        cursor: interactive ? 'crosshair' : 'default',
        touchAction: 'none',
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      {shown && (
        <>
          {/* Dim everything outside the region so the search area reads at a glance. */}
          <path
            d={maskPath(shown, width, height)}
            fillRule="evenodd"
            fill="rgba(5, 7, 10, 0.6)"
          />
          <rect
            x={shown.x}
            y={shown.y}
            width={shown.width}
            height={shown.height}
            fill="none"
            stroke="#4dd0e1"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
      <CentroidMarker centroid={centroid} />
    </svg>
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
 * A path covering the whole frame with the region punched out of it. Two
 * subpaths plus fillRule="evenodd" gives the hole.
 */
function maskPath(rect, width, height) {
  return [
    `M0 0 H${width} V${height} H0 Z`,
    `M${rect.x} ${rect.y} H${rect.x + rect.width} V${rect.y + rect.height} H${rect.x} Z`,
  ].join(' ');
}
