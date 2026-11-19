/**
 * The dot drawn at the centroid of the largest connected group.
 *
 * Coordinates are raw image pixels; the parent SVG's viewBox handles scaling.
 * vectorEffect keeps the stroke width constant instead of scaling with it.
 */
export default function CentroidMarker({ centroid }) {
  if (!centroid) return null;

  const { x, y } = centroid;

  return (
    <g>
      {/* Crosshair, so the exact pixel stays readable on a busy frame. */}
      <line x1={x - 9} y1={y} x2={x + 9} y2={y} stroke="#4dd0e1" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <line x1={x} y1={y - 9} x2={x} y2={y + 9} stroke="#4dd0e1" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <circle cx={x} cy={y} r={4} fill="#ff3b6b" stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </g>
  );
}
