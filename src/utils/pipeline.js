import { binarizePixels } from './binarize.js';
import { findConnectedGroups } from './dfsBinaryGroupFinder.js';
import { findConnectedGroupsInRegion } from './croppingImageGroupFinder.js';
import { toBinaryArray } from './distanceImageBinarizer.js';

/**
 * Port of BinarizingImageGroupFinder.java, plus the crop wrapper.
 *
 * Binarize the frame, then find connected groups of white pixels in it. The
 * groups come back in descending order, so the first one is the largest --
 * that is the salamander, and its centroid is the dot drawn on the preview.
 *
 * Binarization itself is done by binarizePixels in binarize.js, so the pixels
 * drawn on screen and the pixels the group finder searches are produced by the
 * same function. (distanceImageBinarizer.js holds the literal line-by-line
 * translation of the Java; the unit tests check the two against each other.)
 */

/**
 * Converts the RGBA output of binarizePixels into the 2D array of 0s and 1s
 * that DfsBinaryGroupFinder expects, indexed [row][column].
 *
 * binarizePixels writes 255 to R, G and B for white and 0 for black, so
 * reading the red byte of each pixel is enough.
 */
export function toBinaryGrid(rgba, width, height) {
  const grid = new Array(height);
  for (let r = 0; r < height; r++) {
    const row = new Array(width);
    for (let c = 0; c < width; c++) {
      row[c] = rgba[(r * width + c) * 4] === 255 ? 1 : 0;
    }
    grid[r] = row;
  }
  return grid;
}

/**
 * The whole detection pass over one frame.
 *
 * @param {ImageData} imageData the frame's pixels
 * @param {string} hex target color, "#rrggbb" or "rrggbb"
 * @param {number} threshold distance cutoff
 * @param {?{x: number, y: number, width: number, height: number}} roi
 * @returns {{rgba: Uint8ClampedArray, binary: number[][], groups: object[], largest: ?object}}
 */
export function analyzeFrame(imageData, hex, threshold, roi = null) {
  const { width, height, data } = imageData;

  // Their binarizer: one pass, typed array out, ready to paint.
  const rgba = binarizePixels(data, hex, threshold);

  // Same pixels, reshaped for the group search.
  const binary = toBinaryGrid(rgba, width, height);

  const groups = findConnectedGroupsInRegion(binary, roi, findConnectedGroups);

  return { rgba, binary, groups, largest: groups.length > 0 ? groups[0] : null };
}

/**
 * The same pass driven by the literal Java translation instead of
 * binarizePixels. Used by the tests to prove the two agree.
 */
export function findGroupsInImage(imageSource, targetColor, threshold, roi = null) {
  const binary = toBinaryArray(imageSource, targetColor, threshold);
  const groups = findConnectedGroupsInRegion(binary, roi, findConnectedGroups);
  return { binary, groups, largest: groups.length > 0 ? groups[0] : null };
}
