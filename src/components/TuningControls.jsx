import { useEffect, useState } from 'react';
import { toHexColor } from '../lib/euclideanColorDistance.js';

/**
 * The threshold slider and color picker.
 *
 * This component is deliberately "dumb": it holds no state of its own and just
 * renders the values it is given, calling back on change. The real state lives
 * one level up in VideoPreview, because the binarized image, the centroid, and
 * the job submission all need the same two values -- that is the classic case
 * for lifting state into the common parent and passing it down as props.
 *
 * Threshold range: distances are Euclidean in RGB space, so the largest
 * possible distance is between black and white, sqrt(3 * 255^2) = 441.67. 442
 * therefore covers every reachable value -- past that, every pixel is already
 * white and the slider would do nothing.
 */
export const MAX_THRESHOLD = 442;

export default function TuningControls({
  targetColor,
  threshold,
  onTargetColorChange,
  onThresholdChange,
  pickedColor,
}) {
  // The hex field needs a local draft. If it were bound straight to
  // targetColor, every keystroke would be rejected until all six characters
  // were valid -- so clearing the field would snap the old value back and you
  // could never actually type into it. The draft holds whatever is being
  // typed; only a complete, valid value is promoted to real state.
  const [hexDraft, setHexDraft] = useState(() =>
    targetColor.replace(/^#/, '').toUpperCase()
  );

  // Keep the draft in sync when the color changes from somewhere else (the
  // color wheel, say), but not while the field itself is mid-edit.
  useEffect(() => {
    setHexDraft(targetColor.replace(/^#/, '').toUpperCase());
  }, [targetColor]);

  const valid = /^[0-9a-fA-F]{6}$/.test(hexDraft);

  return (
    <div className="controls">
      <div className="control">
        <div className="control-head">
          <label htmlFor="threshold">Threshold</label>
          <output htmlFor="threshold" className="control-value">
            {threshold}
          </output>
        </div>
        <input
          id="threshold"
          type="range"
          min="0"
          max={MAX_THRESHOLD}
          step="1"
          value={threshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          data-testid="threshold-slider"
        />
        <p className="control-hint">
          A pixel turns white when its distance to the target color is{' '}
          <strong>less than</strong> this. 0 gives an all-black image;{' '}
          {MAX_THRESHOLD} gives an all-white one.
        </p>
      </div>

      <div className="control">
        <div className="control-head">
          <label htmlFor="targetColor">Target color</label>
          <output className="control-value control-value--mono">
            {targetColor.replace(/^#/, '').toUpperCase()}
          </output>
        </div>
        <div className="color-row">
          <input
            id="targetColor"
            type="color"
            value={targetColor}
            onChange={(e) => onTargetColorChange(e.target.value)}
            data-testid="color-picker"
          />
          <input
            type="text"
            className={`hex-input${valid || hexDraft === '' ? '' : ' hex-input--invalid'}`}
            value={hexDraft}
            maxLength={6}
            spellCheck={false}
            aria-label="Target color as hex"
            onChange={(e) => {
              // Accept only hex characters, so the field cannot hold junk.
              const raw = e.target.value.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
              setHexDraft(raw);
              // Promote to real state only once it is a complete six-digit
              // value -- a half-typed one would binarize against nonsense.
              if (/^[0-9a-fA-F]{6}$/.test(raw)) onTargetColorChange(`#${raw}`);
            }}
            onBlur={() => {
              // Abandoned half-edit: restore the value actually in use.
              if (!valid) setHexDraft(targetColor.replace(/^#/, '').toUpperCase());
            }}
          />
          {pickedColor != null && (
            <span className="picked-note">
              frame pixel:{' '}
              <code>{toHexColor(pickedColor).replace('#', '').toUpperCase()}</code>
            </span>
          )}
        </div>
        <p className="control-hint">
          The color the salamander should match. Sent to the backend as bare
          six-digit hex -- no leading <code>#</code>, which the API rejects.
        </p>
      </div>
    </div>
  );
}
