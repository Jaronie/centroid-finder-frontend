import assert from 'node:assert/strict';
import {
  distance,
  parseHexColor,
  toHexColor,
} from '../src/utils/euclideanColorDistance.js';

// Mirrors EuclideanColorDistanceTests.java. Same cases, same expected values --
// if the JS port ever drifts from the Java, these fail.
const DELTA = 1e-9;

function assertClose(actual, expected) {
  assert.ok(
    Math.abs(actual - expected) < DELTA,
    `expected ${expected}, got ${actual}`
  );
}

describe('EuclideanColorDistance (ported from Java)', () => {
  it('identical colors have zero distance', () => {
    assertClose(distance(0x000000, 0x000000), 0);
    assertClose(distance(0xffffff, 0xffffff), 0);
    assertClose(distance(0x1a2b3c, 0x1a2b3c), 0);
  });

  it('black to white is the maximum distance', () => {
    assertClose(distance(0x000000, 0xffffff), 255 * Math.sqrt(3));
  });

  it('measures distance along the red channel only', () => {
    assertClose(distance(0x000000, 0xff0000), 255);
  });

  it('measures distance along the green channel only', () => {
    assertClose(distance(0x000000, 0x00ff00), 255);
  });

  it('measures distance along the blue channel only', () => {
    assertClose(distance(0x000000, 0x0000ff), 255);
  });

  it('does not mix up the channels', () => {
    assertClose(distance(0xff0000, 0x0000ff), 255 * Math.sqrt(2));
    assertClose(distance(0xff0000, 0x00ff00), 255 * Math.sqrt(2));
    assertClose(distance(0x00ff00, 0x0000ff), 255 * Math.sqrt(2));
  });

  it('matches a known Pythagorean triple', () => {
    assertClose(distance(0x000000, 0x030400), 5);
  });

  it('is symmetric', () => {
    assertClose(distance(0x123456, 0x654321), distance(0x654321, 0x123456));
  });

  it('handles an arbitrary color pair', () => {
    assertClose(distance(0x102030, 0x405060), 48 * Math.sqrt(3));
  });

  it('handles a small difference in a single channel', () => {
    assertClose(distance(0x808080, 0x808081), 1);
  });

  it('ignores alpha bits', () => {
    assertClose(distance(0xff102030, 0xff405060), 48 * Math.sqrt(3));
  });
});

describe('hex color helpers', () => {
  it('parses with and without the leading hash', () => {
    assert.equal(parseHexColor('#FF8000'), 0xff8000);
    assert.equal(parseHexColor('ff8000'), 0xff8000);
  });

  it('rejects malformed hex', () => {
    assert.throws(() => parseHexColor('#FFF'));
    assert.throws(() => parseHexColor('nothex'));
    assert.throws(() => parseHexColor('#1234567'));
  });

  it('round-trips through toHexColor', () => {
    assert.equal(toHexColor(0x00ff80), '#00ff80');
    assert.equal(parseHexColor(toHexColor(0x1a2b3c)), 0x1a2b3c);
  });

  it('zero-pads short values', () => {
    assert.equal(toHexColor(0x000010), '#000010');
  });
});
