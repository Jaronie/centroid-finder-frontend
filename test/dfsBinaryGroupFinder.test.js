import assert from 'node:assert/strict';
import { findConnectedGroups } from '../src/utils/dfsBinaryGroupFinder.js';
import { compareGroups, toCsvRow } from '../src/utils/group.js';

// Mirrors DfsBinaryGroupFinderTests.java.
// Java's NullPointerException maps to TypeError; IllegalArgumentException to Error.

function sizes(groups) {
  return groups.map((g) => g.size);
}

function centroids(groups) {
  return groups.map((g) => [g.centroid.x, g.centroid.y]);
}

describe('DfsBinaryGroupFinder (ported from Java) - invalid input', () => {
  it('rejects a null image', () => {
    assert.throws(() => findConnectedGroups(null), TypeError);
  });

  it('rejects a null row', () => {
    assert.throws(() => findConnectedGroups([null]), TypeError);
  });

  it('rejects a null row in the middle of an image', () => {
    assert.throws(() => findConnectedGroups([[1, 0], null, [0, 1]]), TypeError);
  });

  it('rejects an empty outer array', () => {
    assert.throws(() => findConnectedGroups([]), Error);
  });

  it('rejects empty rows', () => {
    assert.throws(() => findConnectedGroups([[], []]), Error);
  });

  it('rejects a jagged image', () => {
    assert.throws(() => findConnectedGroups([[1, 0, 1], [1, 0]]), Error);
  });

  it('rejects a value greater than one', () => {
    assert.throws(() => findConnectedGroups([[1, 2], [0, 1]]), Error);
  });

  it('rejects a negative value', () => {
    assert.throws(() => findConnectedGroups([[1, -1], [0, 1]]), Error);
  });
});

describe('DfsBinaryGroupFinder (ported from Java) - group finding', () => {
  it('finds nothing when there are no foreground pixels', () => {
    assert.deepEqual(findConnectedGroups([[0, 0], [0, 0]]), []);
  });

  it('finds nothing in a single zero pixel', () => {
    assert.deepEqual(findConnectedGroups([[0]]), []);
  });

  it('finds nothing in a non-square image of zeros', () => {
    assert.deepEqual(findConnectedGroups([[0, 0, 0], [0, 0, 0]]), []);
  });

  it('finds a single one pixel', () => {
    const groups = findConnectedGroups([[1]]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].size, 1);
    assert.deepEqual(centroids(groups), [[0, 0]]);
  });

  it('finds a horizontal line as one group', () => {
    // (0,1) (1,1) (2,1): size 3, centroid x = 3/3 = 1, y = 3/3 = 1
    const groups = findConnectedGroups([
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].size, 3);
    assert.deepEqual(centroids(groups), [[1, 1]]);
  });

  it('finds a vertical line as one group', () => {
    const groups = findConnectedGroups([
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].size, 3);
    assert.deepEqual(centroids(groups), [[1, 1]]);
  });

  it('uses INTEGER DIVISION for the centroid', () => {
    // Two pixels at (0,0) and (1,0): sumX = 1, size = 2 -> 1/2 = 0, not 0.5
    const groups = findConnectedGroups([[1, 1]]);
    assert.equal(groups[0].size, 2);
    assert.deepEqual(centroids(groups), [[0, 0]]);
  });

  it('treats an all-ones image as one group', () => {
    const groups = findConnectedGroups([
      [1, 1],
      [1, 1],
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].size, 4);
    assert.deepEqual(centroids(groups), [[0, 0]]);
  });

  it('keeps x and y distinct in a wide image', () => {
    // one pixel at column 3, row 0 -> (x:3, y:0)
    const groups = findConnectedGroups([[0, 0, 0, 1, 0]]);
    assert.deepEqual(centroids(groups), [[3, 0]]);
  });

  it('keeps x and y distinct in a tall image', () => {
    // one pixel at column 0, row 3 -> (x:0, y:3)
    const groups = findConnectedGroups([[0], [0], [0], [1], [0]]);
    assert.deepEqual(centroids(groups), [[0, 3]]);
  });

  it('finds an L-shaped group as one group', () => {
    const groups = findConnectedGroups([
      [1, 0, 0],
      [1, 0, 0],
      [1, 1, 1],
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].size, 5);
  });

  it('finds a snake-shaped group as one group', () => {
    const groups = findConnectedGroups([
      [1, 1, 1],
      [0, 0, 1],
      [1, 1, 1],
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].size, 7);
  });

  it('does NOT connect diagonally', () => {
    // Two pixels touching only at a corner are two separate groups.
    const groups = findConnectedGroups([
      [1, 0],
      [0, 1],
    ]);
    assert.equal(groups.length, 2);
    assert.deepEqual(sizes(groups), [1, 1]);
  });

  it('returns groups in DESCENDING order by size', () => {
    const groups = findConnectedGroups([
      [1, 0, 1, 1, 1],
      [0, 0, 1, 1, 1],
      [1, 1, 0, 0, 0],
    ]);
    assert.deepEqual(sizes(groups), [6, 2, 1]);
  });

  it('breaks size ties by centroid x, then y, descending', () => {
    // Three single pixels: (x:0,y:0), (x:2,y:0), (x:0,y:2).
    // compareTo ascending is (0,0) < (0,2) < (2,0); descending reverses it.
    const groups = findConnectedGroups([
      [1, 0, 1],
      [0, 0, 0],
      [1, 0, 0],
    ]);
    assert.deepEqual(sizes(groups), [1, 1, 1]);
    assert.deepEqual(centroids(groups), [
      [2, 0],
      [0, 2],
      [0, 0],
    ]);
  });

  it('handles a large image without blowing the stack', () => {
    // 300x300 solid block: a recursive DFS would overflow here. The port is
    // iterative, like the Java, so this must succeed.
    const image = Array.from({ length: 300 }, () => new Array(300).fill(1));
    const groups = findConnectedGroups(image);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].size, 90000);
    assert.deepEqual(centroids(groups), [[149, 149]]);
  });
});

describe('Group (ported from Java)', () => {
  it('compares by size, then centroid x, then centroid y', () => {
    const g = (size, x, y) => ({ size, centroid: { x, y } });
    assert.ok(compareGroups(g(2, 0, 0), g(1, 9, 9)) > 0);
    assert.ok(compareGroups(g(1, 5, 0), g(1, 3, 9)) > 0);
    assert.ok(compareGroups(g(1, 1, 5), g(1, 1, 3)) > 0);
    assert.equal(compareGroups(g(1, 1, 1), g(1, 1, 1)), 0);
  });

  it('formats a CSV row as size,x,y', () => {
    assert.equal(toCsvRow({ size: 7, centroid: { x: 3, y: 4 } }), '7,3,4');
  });
});
