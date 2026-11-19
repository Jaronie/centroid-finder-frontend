/**
 * Mock data, shaped to match the real API responses exactly.
 *
 * GET /api/videos returns a bare JSON array of filenames, so that is what this
 * is -- not an array of objects. Keeping the shape identical is the whole point:
 * the components cannot tell the difference, so nothing has to change when the
 * real API is used.
 *
 * "testclip.mp4" is the real sample video sitting in the backend's
 * data/videos directory, so the mock list and the live list overlap.
 */
export const mockVideoList = [
  'testclip.mp4',
  'salamander1.mp4',
  'salamander2.mov',
  'forest_intro.mp4',
];

/**
 * A real 320x240 first frame, copied out of the backend's thumbnail cache into
 * public/mock/. Using a real JPEG rather than a generated placeholder matters:
 * the binarizer reads actual pixels, so a fake image would not exercise it
 * meaningfully.
 */
export const mockThumbnail = '/mock/testclip.mp4.jpg';

/** The CSV path shape the server reports for a finished job. */
export const mockResultUrl = (filename) => `/results/${filename}.csv`;
