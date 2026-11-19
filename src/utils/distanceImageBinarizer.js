import { distance } from './euclideanColorDistance.js';

/**
 * Port of DistanceImageBinarizer.java.
 *
 * Binarization is based on the Euclidean distance between a pixel's color and
 * a reference target color. If the distance is LESS THAN the threshold the
 * pixel is white (1); otherwise it is black (0). The comparison is strictly
 * `<`, matching the Java -- so a threshold of 0 produces an all-black image,
 * even where a pixel matches the target color exactly.
 *
 * Java works on a BufferedImage and calls image.getRGB(x, y). The browser hands
 * us an ImageData with a flat RGBA byte array instead, so these functions take
 * a small "image source" object:
 *
 *     { width, height, getRGB(x, y) -> 0xRRGGBB }
 *
 * `imageSourceFromImageData` below builds one from a canvas ImageData, and the
 * Mocha tests build one from a literal 2D array of colors. The pixel loop
 * itself is unchanged.
 */

/**
 * Converts an image source into a binary 2D array using color distance and a
 * threshold. Each entry is 0 (black) or 1 (white).
 *
 * @param {{width: number, height: number, getRGB: (x: number, y: number) => number}} image
 * @param {number} targetColor reference color as 24-bit 0xRRGGBB
 * @param {number} threshold distance cutoff
 * @returns {number[][]} rows of 0s and 1s, indexed [row][column]
 */
export function toBinaryArray(image, targetColor, threshold) {
  const binarizedArray = Array.from({ length: image.height }, () =>
    new Array(image.width).fill(0)
  );

  for (let r = 0; r < image.height; r++) {
    for (let c = 0; c < image.width; c++) {
      // Java: image.getRGB(c, r) & 0xFFFFFF -- the mask drops the alpha byte
      // so the comparison is purely RGB.
      const rgb = image.getRGB(c, r) & 0xffffff;

      if (distance(rgb, targetColor) < threshold) {
        binarizedArray[r][c] = 1;
      } else {
        binarizedArray[r][c] = 0;
      }
    }
  }

  return binarizedArray;
}

/**
 * Port of toBufferedImage: turns a binary 2D array back into something
 * drawable. White pixels become 0xFFFFFF and black pixels 0x000000, exactly as
 * in Java; here the output is a canvas-ready ImageData-shaped object with a
 * fully opaque alpha channel.
 *
 * @param {number[][]} binary rows of 0s and 1s
 * @param {(w: number, h: number) => ImageData} createImageData factory, so this
 *        stays testable in Node where ImageData does not exist
 */
export function toImageData(binary, createImageData) {
  const height = binary.length;
  const width = binary[0].length;
  const out = createImageData(width, height);

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const i = (r * width + c) * 4;
      const value = binary[r][c] === 1 ? 255 : 0;
      out.data[i] = value;
      out.data[i + 1] = value;
      out.data[i + 2] = value;
      out.data[i + 3] = 255;
    }
  }

  return out;
}

/**
 * Adapts a canvas ImageData (flat RGBA bytes) to the getRGB interface above,
 * standing in for Java's BufferedImage.
 */
export function imageSourceFromImageData(imageData) {
  const { width, height, data } = imageData;
  return {
    width,
    height,
    getRGB(x, y) {
      const i = (y * width + x) * 4;
      return (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    },
  };
}

/**
 * Adapts a 2D array of 0xRRGGBB ints to the same interface. Used by the tests
 * to mirror the Java unit tests, which construct BufferedImages by hand.
 */
export function imageSourceFromColorGrid(grid) {
  return {
    width: grid[0].length,
    height: grid.length,
    getRGB(x, y) {
      return grid[y][x];
    },
  };
}
