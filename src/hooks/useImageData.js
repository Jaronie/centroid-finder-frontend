import { useEffect, useState } from 'react';

/**
 * Loads an image URL and hands back its raw pixels as ImageData.
 *
 * This is the bridge between "the backend sent JPEG bytes" and "the binarizer
 * needs to read pixel colors". The browser cannot give us pixels from an <img>
 * directly, so the image is drawn onto an offscreen canvas and read back with
 * getImageData. That ImageData is what the ported Java code consumes.
 *
 * The effect re-runs whenever src changes and sets a `cancelled` flag on
 * cleanup, so a thumbnail that finishes loading after the user has navigated
 * away cannot write to unmounted state.
 *
 * @param {?string} src image URL, or null to load nothing
 * @returns {{imageData: ?ImageData, image: ?HTMLImageElement, loading: boolean, error: ?string}}
 */
export function useImageData(src) {
  const [state, setState] = useState({
    imageData: null,
    image: null,
    loading: Boolean(src),
    error: null,
  });

  useEffect(() => {
    if (!src) {
      setState({ imageData: null, image: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState({ imageData: null, image: null, loading: true, error: null });

    const image = new Image();
    // The thumbnail is same-origin through the Vite proxy, so the canvas does
    // not get tainted and getImageData is allowed. crossOrigin keeps that true
    // if the API is ever moved to a separate host that sends CORS headers.
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setState({ imageData, image, loading: false, error: null });
      } catch (e) {
        setState({
          imageData: null,
          image: null,
          loading: false,
          error: `Could not read pixels from the thumbnail: ${e.message}`,
        });
      }
    };

    image.onerror = () => {
      if (cancelled) return;
      setState({
        imageData: null,
        image: null,
        loading: false,
        error: 'Could not load the thumbnail. Is the backend running on port 8081?',
      });
    };

    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return state;
}
