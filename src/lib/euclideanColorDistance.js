/**
 * Port of EuclideanColorDistance.java.
 *
 * Returns the Euclidean color distance between two hex RGB colors.
 *
 * Each color is a 24-bit integer 0xRRGGBB. The colors are treated as points in
 * 3D (red, green, blue) space:
 *
 *     sqrt((r1 - r2)^2 + (g1 - g2)^2 + (b1 - b2)^2)
 *
 * The Java original uses `(color >> 16) & 0xFF` etc. JavaScript's bitwise
 * operators coerce to a signed 32-bit int before operating, which is exactly
 * what Java's `int` is -- so these shifts and masks behave identically for the
 * 24-bit values we pass in.
 */
export function distance(colorA, colorB) {
  const r = getRed(colorA) - getRed(colorB);
  const g = getGreen(colorA) - getGreen(colorB);
  const b = getBlue(colorA) - getBlue(colorB);
  return Math.sqrt(r * r + g * g + b * b);
}

export function getRed(color) {
  return (color >> 16) & 0xff;
}

export function getGreen(color) {
  return (color >> 8) & 0xff;
}

export function getBlue(color) {
  return color & 0xff;
}

/**
 * Parses a hex color string into the 24-bit integer the functions above expect.
 * Accepts "#RRGGBB" or "RRGGBB" -- the browser's <input type="color"> always
 * hands us the leading "#" form, while the backend requires it stripped.
 */
export function parseHexColor(hex) {
  if (typeof hex !== 'string') throw new TypeError('Hex color must be a string.');
  const cleaned = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return parseInt(cleaned, 16);
}

/** Inverse of parseHexColor: 24-bit int -> "#rrggbb" for <input type="color">. */
export function toHexColor(color) {
  return `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;
}
