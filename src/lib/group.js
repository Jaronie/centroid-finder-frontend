/**
 * Port of Group.java and Coordinate.java.
 *
 * Java records become plain frozen objects. A Coordinate is {x, y}; a Group is
 * {size, centroid}. The top-left pixel is (x:0, y:0), y increases downward and
 * x increases to the right, so (row:4, column:7) is (x:7, y:4).
 */

export function coordinate(x, y) {
  return Object.freeze({ x, y });
}

export function group(size, centroid) {
  return Object.freeze({ size, centroid });
}

/**
 * Port of Group.compareTo: size first, then centroid x, then centroid y.
 * Returns a negative number, zero, or a positive number -- the same contract as
 * Java's Comparable, so it drops straight into Array.prototype.sort.
 */
export function compareGroups(a, b) {
  let comp = compareInts(a.size, b.size);
  if (comp !== 0) return comp;
  comp = compareInts(a.centroid.x, b.centroid.x);
  if (comp !== 0) return comp;
  return compareInts(a.centroid.y, b.centroid.y);
}

/** Stand-in for Integer.compare. */
function compareInts(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Port of Group.toCsvRow: "size,x,y". */
export function toCsvRow(g) {
  return `${g.size},${g.centroid.x},${g.centroid.y}`;
}
