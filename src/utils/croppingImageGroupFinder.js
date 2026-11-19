import { group, coordinate } from './group.js';

/**
 * Port of CroppingImageGroupFinder.java.
 *
 * "Largest group" is only a useful rule when the subject really is the largest
 * matching blob in the frame. Dark borders, letterboxing, or any fixed object
 * sharing the subject's color can out-size it. Restricting the search to a
 * region of interest (ROI) restores the rule without changing how groups are
 * found or ranked.
 *
 * Centroids are translated back into FULL-FRAME coordinates before being
 * returned, so the UI never shows ROI-relative numbers. Sizes are unaffected,
 * and because the translation shifts every centroid equally the delegate's
 * descending sort order is preserved.
 */

/**
 * @param {number[][]} binary full-frame binary array, indexed [row][column]
 * @param {{x: number, y: number, width: number, height: number}} roi
 * @param {(binary: number[][]) => object[]} delegate usually findConnectedGroups
 */
export function findConnectedGroupsInRegion(binary, roi, delegate) {
  if (binary == null) throw new TypeError('Image cannot be null.');
  if (roi == null) return delegate(binary);

  const { x, y, width, height } = roi;
  if (x < 0 || y < 0) {
    throw new Error(`Crop origin cannot be negative: (${x},${y})`);
  }
  if (width <= 0 || height <= 0) {
    throw new Error(`Crop size must be positive: ${width}x${height}`);
  }

  const imageHeight = binary.length;
  const imageWidth = binary[0].length;

  // The region is clipped to the image, so an ROI larger than the frame is
  // searched as far as it goes rather than throwing.
  const cropX = Math.min(x, imageWidth);
  const cropY = Math.min(y, imageHeight);
  const cropWidth = Math.min(width, imageWidth - cropX);
  const cropHeight = Math.min(height, imageHeight - cropY);

  if (cropWidth <= 0 || cropHeight <= 0) return [];

  // No crop needed: hand the frame straight through, untranslated.
  if (
    cropX === 0 &&
    cropY === 0 &&
    cropWidth === imageWidth &&
    cropHeight === imageHeight
  ) {
    return delegate(binary);
  }

  // Java calls image.getSubimage(...); here we slice the rows and columns.
  const region = [];
  for (let r = cropY; r < cropY + cropHeight; r++) {
    region.push(binary[r].slice(cropX, cropX + cropWidth));
  }

  const found = delegate(region);

  // Translate centroids back to full-frame coordinates.
  return found.map((g) =>
    group(g.size, coordinate(g.centroid.x + cropX, g.centroid.y + cropY))
  );
}

/**
 * Port of the fromInset factory: trims an equal margin from all four sides.
 * This is what the processor's `--inset=N` CLI flag maps to.
 */
export function roiFromInset(inset, frameWidth, frameHeight) {
  if (inset < 0) throw new Error(`Inset cannot be negative: ${inset}`);
  const remainingWidth = frameWidth - 2 * inset;
  const remainingHeight = frameHeight - 2 * inset;
  if (remainingWidth <= 0 || remainingHeight <= 0) {
    throw new Error(
      `Inset ${inset} leaves no pixels in a ${frameWidth}x${frameHeight} frame.`
    );
  }
  return { x: inset, y: inset, width: remainingWidth, height: remainingHeight };
}
