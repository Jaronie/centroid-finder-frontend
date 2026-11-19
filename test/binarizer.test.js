import assert from 'node:assert/strict';
import {
  toBinaryArray,
  toImageData,
  imageSourceFromColorGrid,
  imageSourceFromImageData,
} from '../src/utils/distanceImageBinarizer.js';
import {
  findConnectedGroupsInRegion,
  roiFromInset,
} from '../src/utils/croppingImageGroupFinder.js';
import { findConnectedGroups } from '../src/utils/dfsBinaryGroupFinder.js';
import { findGroupsInImage } from '../src/utils/pipeline.js';

// Stand-in for the browser's ImageData, so these tests run in plain Node.
function createImageData(width, height) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

const BLACK = 0x000000;
const WHITE = 0xffffff;
const RED = 0xff0000;

// Mirrors DistanceImageBinarizerTest.java.
describe('DistanceImageBinarizer (ported from Java)', () => {
  it('produces correct dimensions for a non-square image', () => {
    const image = imageSourceFromColorGrid([
      [BLACK, BLACK, BLACK],
      [BLACK, BLACK, BLACK],
    ]);
    const binary = toBinaryArray(image, BLACK, 10);
    assert.equal(binary.length, 2);
    assert.equal(binary[0].length, 3);
  });

  it('marks a pixel below the threshold as 1', () => {
    const image = imageSourceFromColorGrid([[BLACK]]);
    assert.equal(toBinaryArray(image, BLACK, 10)[0][0], 1);
  });

  it('marks a pixel above the threshold as 0', () => {
    const image = imageSourceFromColorGrid([[WHITE]]);
    assert.equal(toBinaryArray(image, BLACK, 10)[0][0], 0);
  });

  it('marks a distance EQUAL to the threshold as 0 (strict less-than)', () => {
    // distance(black, red) is exactly 255.
    const image = imageSourceFromColorGrid([[RED]]);
    assert.equal(toBinaryArray(image, BLACK, 255)[0][0], 0);
    assert.equal(toBinaryArray(image, BLACK, 256)[0][0], 1);
  });

  it('produces an all-black image at threshold 0, even on an exact match', () => {
    const image = imageSourceFromColorGrid([[RED]]);
    assert.equal(toBinaryArray(image, RED, 0)[0][0], 0);
  });

  it('maps pixel position to the correct row and column', () => {
    // One red pixel at (x:2, y:0) must land at binary[0][2], not binary[2][0].
    const image = imageSourceFromColorGrid([
      [BLACK, BLACK, RED],
      [BLACK, BLACK, BLACK],
    ]);
    const binary = toBinaryArray(image, RED, 10);
    assert.equal(binary[0][2], 1);
    assert.equal(binary[0][0], 0);
    assert.equal(binary[1][0], 0);
  });

  it('ignores the alpha byte when comparing colors', () => {
    // 0xFF000000 is opaque black; the & 0xFFFFFF mask must drop the alpha.
    const image = imageSourceFromColorGrid([[0xff000000 | BLACK]]);
    assert.equal(toBinaryArray(image, BLACK, 1)[0][0], 1);
  });

  it('converts a binary array back to white and black pixels', () => {
    const out = toImageData([[1, 0]], createImageData);
    assert.equal(out.width, 2);
    assert.equal(out.height, 1);
    // pixel 0 -> white, fully opaque
    assert.deepEqual([...out.data.slice(0, 4)], [255, 255, 255, 255]);
    // pixel 1 -> black, fully opaque
    assert.deepEqual([...out.data.slice(4, 8)], [0, 0, 0, 255]);
  });

  it('round-trips a binary array through ImageData and back', () => {
    const binary = [
      [1, 0, 1],
      [0, 1, 0],
    ];
    const imageData = toImageData(binary, createImageData);
    const source = imageSourceFromImageData(imageData);
    // White (0xFFFFFF) is distance 0 from the target; black is 441. A threshold
    // of 1 recovers exactly the original 1s.
    assert.deepEqual(toBinaryArray(source, WHITE, 1), binary);
  });
});

// Mirrors CroppingImageGroupFinderTests.java.
describe('CroppingImageGroupFinder (ported from Java)', () => {
  // A 1-pixel blob at (x:1,y:1) and a 3-pixel blob along the bottom edge.
  const binary = [
    [0, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 0],
    [1, 1, 1, 0],
  ];

  it('returns every group when the ROI is null', () => {
    const groups = findConnectedGroupsInRegion(binary, null, findConnectedGroups);
    assert.deepEqual(groups.map((g) => g.size), [3, 1]);
  });

  it('excludes groups outside the ROI', () => {
    // Rows 0-2 only: the bottom-edge blob is excluded, so the 1-pixel blob wins.
    const roi = { x: 0, y: 0, width: 4, height: 3 };
    const groups = findConnectedGroupsInRegion(binary, roi, findConnectedGroups);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].size, 1);
  });

  it('translates centroids back into FULL-FRAME coordinates', () => {
    // ROI starting at (1,1) contains the single pixel at its own (0,0).
    // Translated back it must read (x:1, y:1), not (0,0).
    const roi = { x: 1, y: 1, width: 2, height: 2 };
    const groups = findConnectedGroupsInRegion(binary, roi, findConnectedGroups);
    assert.deepEqual(groups[0].centroid, { x: 1, y: 1 });
  });

  it('clips an ROI larger than the frame instead of throwing', () => {
    const roi = { x: 0, y: 0, width: 999, height: 999 };
    const groups = findConnectedGroupsInRegion(binary, roi, findConnectedGroups);
    assert.deepEqual(groups.map((g) => g.size), [3, 1]);
  });

  it('returns an empty list when the ROI falls outside the image', () => {
    const roi = { x: 10, y: 10, width: 5, height: 5 };
    assert.deepEqual(findConnectedGroupsInRegion(binary, roi, findConnectedGroups), []);
  });

  it('rejects a negative origin and a non-positive size', () => {
    assert.throws(() => findConnectedGroupsInRegion(binary, { x: -1, y: 0, width: 2, height: 2 }, findConnectedGroups));
    assert.throws(() => findConnectedGroupsInRegion(binary, { x: 0, y: 0, width: 0, height: 2 }, findConnectedGroups));
  });

  it('builds an inset ROI, matching the --inset=N CLI flag', () => {
    assert.deepEqual(roiFromInset(2, 10, 8), { x: 2, y: 2, width: 6, height: 4 });
    assert.throws(() => roiFromInset(-1, 10, 10));
    assert.throws(() => roiFromInset(5, 10, 10)); // leaves nothing behind
  });
});

// Mirrors BinarizingImageGroupFinderTests.java: binarize, then group.
describe('full pipeline (binarize -> find groups -> largest centroid)', () => {
  it('finds the centroid of the largest red blob', () => {
    // A 2x2 red block at columns 1-2, rows 1-2, plus one stray red pixel.
    const image = imageSourceFromColorGrid([
      [BLACK, BLACK, BLACK, RED],
      [BLACK, RED, RED, BLACK],
      [BLACK, RED, RED, BLACK],
    ]);
    const { groups, largest } = findGroupsInImage(image, RED, 10);
    assert.deepEqual(groups.map((g) => g.size), [4, 1]);
    // sumX = 1+2+1+2 = 6, sumY = 1+1+2+2 = 6, size 4 -> 6/4 = 1 (integer div)
    assert.deepEqual(largest.centroid, { x: 1, y: 1 });
  });

  it('reports no largest group when nothing matches', () => {
    const image = imageSourceFromColorGrid([[BLACK, BLACK]]);
    const { groups, largest } = findGroupsInImage(image, RED, 10);
    assert.deepEqual(groups, []);
    assert.equal(largest, null);
  });

  it('honours the ROI end to end', () => {
    const image = imageSourceFromColorGrid([
      [RED, RED, RED, RED],
      [BLACK, RED, BLACK, BLACK],
    ]);
    // Without an ROI the 5-pixel group wins. Restricting to row 1 leaves only
    // the single pixel at (x:1, y:1).
    const roi = { x: 0, y: 1, width: 4, height: 1 };
    const { largest } = findGroupsInImage(image, RED, 10, roi);
    assert.equal(largest.size, 1);
    assert.deepEqual(largest.centroid, { x: 1, y: 1 });
  });
});
