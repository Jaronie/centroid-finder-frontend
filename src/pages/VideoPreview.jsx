import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { thumbnailUrl } from '../api/client.js';
import { useImageData } from '../hooks/useImageData.js';
import { useBinarization } from '../hooks/useBinarization.js';
import { useJob } from '../hooks/useJob.js';
import { imageSourceFromImageData } from '../lib/distanceImageBinarizer.js';
import OriginalFrame from '../components/OriginalFrame.jsx';
import BinarizedCanvas from '../components/BinarizedCanvas.jsx';
import TuningControls from '../components/TuningControls.jsx';
import JobPanel from '../components/JobPanel.jsx';

/**
 * Video Preview and Processing page -- route /preview/:filename.
 *
 * This page owns all the tuning state and passes it down, because three
 * separate things need the same two values: the binarized preview, the centroid
 * marker, and the job submission. Keeping them here is what makes the preview
 * and the submitted job provably consistent -- you cannot submit settings
 * different from the ones you are looking at.
 *
 * The data flow in one line:
 *
 *   GET /thumbnail/{filename}  ->  <img>  ->  offscreen canvas  ->  ImageData
 *     ->  binarize (Euclidean distance vs target color)  ->  binary 2D array
 *     ->  DFS connected groups  ->  sort descending  ->  largest  ->  dot
 *
 * Steps 2, 3, 4 and 5 of the assignment are all visible on this page.
 */

/** Defaults chosen to show something useful on first load rather than a blank frame. */
const DEFAULT_COLOR = '#000000';
const DEFAULT_THRESHOLD = 100;

export default function VideoPreview() {
  // The filename comes from the URL, so this page is reloadable and shareable.
  const { filename } = useParams();

  const [targetColor, setTargetColor] = useState(DEFAULT_COLOR);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [roi, setRoi] = useState(null);
  const [pickedColor, setPickedColor] = useState(null);

  // Step 2: fetch the first frame and get at its pixels.
  const { imageData, loading, error: imageError } = useImageData(
    thumbnailUrl(filename)
  );

  // Memoized so useBinarization's dependency array sees a stable object and
  // does not re-run the pipeline on every unrelated render.
  const stableRoi = useMemo(
    () =>
      roi ? { x: roi.x, y: roi.y, width: roi.width, height: roi.height } : null,
    [roi?.x, roi?.y, roi?.width, roi?.height]
  );

  // Step 3: run the ported Java pipeline, live, as the settings change.
  const { binary, groups, largest, computing, error: analysisError } =
    useBinarization(imageData, targetColor, threshold, stableRoi);

  // Steps 4 and 5: submit and track the job.
  const job = useJob(filename);

  const width = imageData?.width ?? 0;
  const height = imageData?.height ?? 0;

  /**
   * Reads the color of a single pixel under the pointer. Used to show what is
   * actually under the cursor, which makes picking a sensible target color much
   * less of a guessing game than spinning the color wheel.
   */
  const handleHover = (point) => {
    if (!imageData || !point) {
      setPickedColor(null);
      return;
    }
    const source = imageSourceFromImageData(imageData);
    setPickedColor(source.getRGB(point.x, point.y));
  };

  return (
    <section className="preview">
      <div className="preview-head">
        <div>
          <Link to="/videos" className="back-link">
            &larr; All videos
          </Link>
          <h1 className="preview-title">{filename}</h1>
        </div>
        <div className="preview-meta">
          {width > 0 && (
            <span>
              {width} x {height} px
            </span>
          )}
          {computing && <span className="computing">analyzing...</span>}
        </div>
      </div>

      {loading && <p className="muted">Loading first frame...</p>}

      {imageError && (
        <div className="error">
          <p>{imageError}</p>
          <p className="control-hint">
            The thumbnail comes from <code>GET /thumbnail/{filename}</code>,
            which needs the backend running on port 8081.
          </p>
        </div>
      )}

      {imageData && (
        <>
          {/* Step 2: original and binarized, side by side. */}
          <div className="frames">
            <figure>
              <figcaption>
                <span>Original frame</span>
                <span className="figcaption-hint">
                  drag to set a search region
                </span>
              </figcaption>
              <OriginalFrame
                src={thumbnailUrl(filename)}
                width={width}
                height={height}
                centroid={largest?.centroid}
                roi={roi}
                onRoiChange={setRoi}
                onHover={handleHover}
              />
            </figure>

            <figure>
              <figcaption>
                <span>Binarized</span>
                <span className="figcaption-hint">updates live</span>
              </figcaption>
              <BinarizedCanvas
                binary={binary}
                width={width}
                height={height}
                centroid={largest?.centroid}
              />
            </figure>
          </div>

          {/* Step 3: live tuning. */}
          <div className="card">
            <h2>Detector settings</h2>
            <TuningControls
              targetColor={targetColor}
              threshold={threshold}
              onTargetColorChange={setTargetColor}
              onThresholdChange={setThreshold}
              pickedColor={pickedColor}
            />

            {/* The unique feature's readout and reset. */}
            <div className="roi-row">
              {roi ? (
                <>
                  <span className="roi-label">
                    Search region:{' '}
                    <code>
                      x={roi.x} y={roi.y} w={roi.width} h={roi.height}
                    </code>
                  </span>
                  <button
                    type="button"
                    className="secondary small"
                    onClick={() => setRoi(null)}
                    data-testid="clear-roi"
                  >
                    Clear region
                  </button>
                </>
              ) : (
                <span className="roi-label muted">
                  Searching the whole frame. Drag a rectangle on the original to
                  ignore dark borders that out-size the salamander.
                </span>
              )}
            </div>

            {analysisError && <p className="error">{analysisError}</p>}

            <dl className="stats" data-testid="stats">
              <div>
                <dt>Groups found</dt>
                <dd>{groups.length}</dd>
              </div>
              <div>
                <dt>Largest group size</dt>
                <dd>{largest ? `${largest.size} px` : '--'}</dd>
              </div>
              <div>
                <dt>Centroid</dt>
                <dd data-testid="centroid">
                  {largest
                    ? `(${largest.centroid.x}, ${largest.centroid.y})`
                    : 'no match'}
                </dd>
              </div>
            </dl>

            {!largest && !computing && (
              <p className="muted">
                Nothing matched. Raise the threshold or pick a color closer to
                the subject.
              </p>
            )}
          </div>

          {/* Steps 4 and 5. */}
          <JobPanel
            {...job}
            onSubmit={job.submit}
            onReset={job.reset}
            disabled={!imageData}
            targetColor={targetColor}
            threshold={threshold}
            roi={roi}
          />
        </>
      )}
    </section>
  );
}
