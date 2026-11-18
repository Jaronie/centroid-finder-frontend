export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// White where the pixel is within `threshold` of the target color
// (Euclidean RGB distance), black elsewhere.
export function binarizePixels(data, hex, threshold) {
  const [tr, tg, tb] = hexToRgb(hex);
  const limit = threshold * threshold;
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - tr;
    const dg = data[i + 1] - tg;
    const db = data[i + 2] - tb;
    const v = dr * dr + dg * dg + db * db <= limit ? 255 : 0;
    out[i] = out[i + 1] = out[i + 2] = v;
    out[i + 3] = 255;
  }
  return out;
}