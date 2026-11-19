export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// White where the pixel is within `threshold` of the target color
// (Euclidean RGB distance), black elsewhere.
//
// Comparing squared distances against a squared threshold avoids a sqrt per
// pixel and is exactly equivalent, because both sides are non-negative.
//
// The comparison is STRICTLY less-than, matching DistanceImageBinarizer.java:
//
//     if (distanceFinder.distance(rgb, targetColor) < threshold)
//
// (It was "<=" here. That disagrees with the Java at exactly the boundary --
// most visibly at threshold 0, where "<=" marks an exact color match white but
// the Java produces an all-black image. The frontend preview has to agree with
// the backend's CSV, so it follows the Java.)
export function binarizePixels(data, hex, threshold) {
  const [tr, tg, tb] = hexToRgb(hex);
  const limit = threshold * threshold;
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - tr;
    const dg = data[i + 1] - tg;
    const db = data[i + 2] - tb;
    const v = dr * dr + dg * dg + db * db < limit ? 255 : 0;
    out[i] = out[i + 1] = out[i + 2] = v;
    out[i + 3] = 255;
  }
  return out;
}