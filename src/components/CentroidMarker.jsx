/**
 * The dot drawn at the centroid of the largest connected group.
 *
 * It lives in an SVG overlay whose viewBox is the frame's pixel dimensions, so
 * the coordinates the algorithm produced can be used verbatim -- no manual
 * scaling math -- and the dot stays correct however the image is sized by CSS.
 * vectorEffect keeps the stroke width constant rather than scaling with it.
 */
export default function CentroidMarker({ centroid, label }) {
  if (!centroid) return null;

  const { x, y } = centroid;

  return (
    <g className="centroid-marker">
      {/* Crosshair, so the exact pixel is readable even on a busy frame. */}
      <line x1={x - 9} y1={y} x2={x + 9} y2={y} vectorEffect="non-scaling-stroke" />
      <line x1={x} y1={y - 9} x2={x} y2={y + 9} vectorEffect="non-scaling-stroke" />
      <circle
        cx={x}
        cy={y}
        r={4}
        className="centroid-dot"
        vectorEffect="non-scaling-stroke"
      />
      {label && (
        <text x={x + 12} y={y - 10} className="centroid-label">
          {label}
        </text>
      )}
    </g>
  );
}
