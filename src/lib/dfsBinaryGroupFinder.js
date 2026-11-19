import { coordinate, group, compareGroups } from './group.js';

/**
 * Port of DfsBinaryGroupFinder.java.
 *
 * Pixels are connected vertically and horizontally, NOT diagonally -- hence the
 * four directions below and no (1,1)-style entries.
 */
const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Finds connected groups of 1s in a rectangular 2D array of 0s and 1s.
 *
 * The input must be non-empty and rectangular. A null/undefined array or row
 * raises a TypeError (Java's NullPointerException); any other invalid input
 * raises an Error (Java's IllegalArgumentException).
 *
 * Group size is the pixel count. The centroid is the average of the pixel
 * coordinates in each dimension, using INTEGER DIVISION. Groups come back
 * sorted in DESCENDING order by Group's compareTo.
 *
 * @param {number[][]} image rectangular 2D array of 1s and 0s
 * @returns {{size: number, centroid: {x: number, y: number}}[]}
 */
export function findConnectedGroups(image) {
  // Java: throw NullPointerException
  if (image == null) throw new TypeError('Image cannot be null.');

  // Check for size. Java reads image[0].length here, so a null first row
  // raises a NullPointerException before the size check can fail -- we throw
  // TypeError in the same spot to keep the behaviour identical.
  if (image.length !== 0 && image[0] == null) {
    throw new TypeError('Image row cannot be null.');
  }
  if (image.length === 0 || image[0].length === 0) {
    throw new Error('Image cannot have size of zero.');
  }

  const ROWS = image.length;
  const COLS = image[0].length;

  // Check for jagged edges + invalid values
  for (let r = 0; r < ROWS; r++) {
    if (image[r] == null) throw new TypeError('Image row cannot be null.');
    if (image[r].length !== COLS) throw new Error('Image must be rectangular.');

    for (let c = 0; c < COLS; c++) {
      if (image[r][c] !== 1 && image[r][c] !== 0) {
        throw new Error('Image must contain only 1 and 0.');
      }
    }
  }

  const groupList = [];

  // Visited matrix. Java's `new boolean[h][w]` defaults to false; a
  // Uint8Array defaults to 0, which we read as falsy the same way.
  const visited = Array.from({ length: ROWS }, () => new Uint8Array(COLS));

  // Iterate through image searching for 1
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (image[r][c] === 1 && !visited[r][c]) {
        groupList.push(findGroup(image, visited, coordinate(c, r)));
      }
    }
  }

  // Sort groups. Java: groupList.sort((a, b) -> b.compareTo(a)) -- descending.
  groupList.sort((a, b) => compareGroups(b, a));

  return groupList;
}

/**
 * Iterative DFS from one unvisited white pixel, accumulating size and the
 * coordinate sums needed for the centroid. Mirrors the private findGroup
 * helper in the Java class, including marking pixels visited as they are
 * pushed rather than as they are popped.
 */
function findGroup(image, visited, start) {
  // Java uses an ArrayDeque as a stack; push/pop on a JS array is the same
  // LIFO behaviour.
  const stack = [];

  stack.push(start);
  visited[start.y][start.x] = 1;

  let size = 0;
  let sumX = 0;
  let sumY = 0;

  while (stack.length !== 0) {
    const current = stack.pop();

    size += 1;
    sumX += current.x;
    sumY += current.y;

    for (const dir of DIRECTIONS) {
      const ny = current.y + dir[1];
      const nx = current.x + dir[0];

      if (
        ny < 0 ||
        nx < 0 ||
        ny >= image.length ||
        nx >= image[0].length ||
        visited[ny][nx] ||
        image[ny][nx] === 0
      ) {
        continue;
      }

      visited[ny][nx] = 1;
      stack.push(coordinate(nx, ny));
    }
  }

  // INTEGER DIVISION. Java's `int / int` truncates toward zero; Math.trunc is
  // the exact equivalent. (The sums are never negative here, so Math.floor
  // would agree, but trunc is the faithful translation.)
  const centroid = coordinate(Math.trunc(sumX / size), Math.trunc(sumY / size));

  return group(size, centroid);
}
