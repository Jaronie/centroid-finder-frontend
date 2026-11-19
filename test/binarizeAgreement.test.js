import assert from 'node:assert/strict';
import { binarizePixels, hexToRgb } from '../src/utils/binarize.js';
import { toBinaryArray, imageSourceFromImageData } from '../src/utils/distanceImageBinarizer.js';
import { toBinaryGrid } from '../src/utils/pipeline.js';
import { parseHexColor } from '../src/utils/euclideanColorDistance.js';

/**
 * binarize.js is the fast path the app actually runs: one pass over a typed
 * array, comparing squared distances to avoid a sqrt per pixel.
 * distanceImageBinarizer.js is the literal line-by-line translation of
 * DistanceImageBinarizer.java.
 *
 * They must agree on every pixel. These tests are what keeps the optimized
 * version honest -- if either drifts from the Java, this fails.
 */

/** Builds an ImageData-shaped object from a flat list of 0xRRGGBB colors. */
function imageDataFromColors(colors, width) {
  const height = colors.length / width;
  const data = new Uint8ClampedArray(width * height * 4);
  colors.forEach((c, i) => {
    data[i * 4] = (c >> 16) & 0xff;
    data[i * 4 + 1] = (c >> 8) & 0xff;
    data[i * 4 + 2] = c & 0xff;
    data[i * 4 + 3] = 255;
  });
  return { width, height, data };
}

/** Deterministic pseudo-random colors, so a failure is always reproducible. */
function randomColors(count, seed = 1) {
  let s = seed;
  const next = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s % 256;
  };
  return Array.from({ length: count }, () => (next() << 16) | (next() << 8) | next());
}

describe('binarize.js agrees with the literal Java translation', () => {
  it('matches on a random image across many thresholds', () => {
    const width = 40;
    const height = 30;
    const imageData = imageDataFromColors(randomColors(width * height), width);
    const source = imageSourceFromImageData(imageData);

    for (const hex of ['#000000', '#FFFFFF', '#1A1A1A', '#E53935', '#43A047']) {
      const target = parseHexColor(hex);
      for (const threshold of [0, 1, 50, 100, 120, 255, 441, 442]) {
        const fast = toBinaryGrid(
          binarizePixels(imageData.data, hex, threshold),
          width,
          height
        );
        const faithful = toBinaryArray(source, target, threshold);
        assert.deepEqual(
          fast,
          faithful,
          `mismatch at hex=${hex} threshold=${threshold}`
        );
      }
    }
  });

  it('agrees at the exact boundary (strict less-than)', () => {
    // distance(black, red) is exactly 255.
    const imageData = imageDataFromColors([0xff0000], 1);
    const source = imageSourceFromImageData(imageData);

    for (const threshold of [254, 255, 256]) {
      const fast = toBinaryGrid(binarizePixels(imageData.data, '#000000', threshold), 1, 1);
      const faithful = toBinaryArray(source, 0x000000, threshold);
      assert.deepEqual(fast, faithful, `mismatch at threshold=${threshold}`);
    }

    // Specifically: equal to the threshold is BLACK, matching the Java.
    assert.deepEqual(toBinaryGrid(binarizePixels(imageData.data, '#000000', 255), 1, 1), [[0]]);
    assert.deepEqual(toBinaryGrid(binarizePixels(imageData.data, '#000000', 256), 1, 1), [[1]]);
  });

  it('produces an all-black image at threshold 0, even on an exact match', () => {
    const imageData = imageDataFromColors([0xe53935, 0xe53935], 2);
    assert.deepEqual(toBinaryGrid(binarizePixels(imageData.data, '#E53935', 0), 2, 1), [[0, 0]]);
  });

  it('hexToRgb accepts both "#rrggbb" and "rrggbb"', () => {
    assert.deepEqual(hexToRgb('#1A2B3C'), [0x1a, 0x2b, 0x3c]);
    assert.deepEqual(hexToRgb('1A2B3C'), [0x1a, 0x2b, 0x3c]);
  });
});
