import { toBinaryArray, imageSourceFromImageData } from './distanceImageBinarizer.js';
import { findConnectedGroups } from './dfsBinaryGroupFinder.js';
import { findConnectedGroupsInRegion } from './croppingImageGroupFinder.js';

/**
 * Port of BinarizingImageGroupFinder.java, plus the crop wrapper.
 *
 * Binarize the frame, then find connected groups of white pixels in it. The
 * groups come back in descending order, so the first one is the largest -- that
 * is the salamander, and its centroid is the dot we draw.
 *
 * This is the single function the preview page calls on every slider move.
 *
 * @param {{width: number, height: number, getRGB: Function}} imageSource
 * @param {number} targetColor 24-bit 0xRRGGBB
 * @param {number} threshold distance cutoff
 * @param {?{x: number, y: number, width: number, height: number}} roi
 */
export function findGroupsInImage(imageSource, targetColor, threshold, roi = null) {
  const binary = toBinaryArray(imageSource, targetColor, threshold);
  const groups = findConnectedGroupsInRegion(binary, roi, findConnectedGroups);
  return { binary, groups, largest: groups.length > 0 ? groups[0] : null };
}

/** Convenience wrapper for the browser, where frames arrive as ImageData. */
export function analyzeImageData(imageData, targetColor, threshold, roi = null) {
  return findGroupsInImage(
    imageSourceFromImageData(imageData),
    targetColor,
    threshold,
    roi
  );
}
