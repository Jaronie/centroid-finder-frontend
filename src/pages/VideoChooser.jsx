import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchVideos } from '../api/client.js';

/**
 * ============================================================================
 * STEP 1 -- Video Chooser page. OWNED BY TEAMMATE.
 *
 * This is a minimal working version so the rest of the app runs and can be
 * tested end to end. Replace or extend it freely; the only contract the other
 * pages depend on is that each entry links to /preview/<filename>.
 * ============================================================================
 *
 * Fetches GET /api/videos and renders each filename as a link to its preview
 * page. The call lives in useEffect with an empty dependency array, so it runs
 * once after the first render rather than on every render -- fetching directly
 * in the component body would loop forever, since setting state re-renders.
 */
export default function VideoChooser() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const data = await fetchVideos({ signal: controller.signal });
        setVideos(data);
        setError(null);
      } catch (e) {
        if (e.name === 'AbortError') return;
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    load();

    // Aborts the request if the user navigates away before it resolves.
    return () => controller.abort();
  }, []);

  return (
    <section className="card">
      <h1>Choose a video</h1>
      <p className="subtitle">
        Pick a clip to preview its first frame and tune the detector settings.
      </p>

      {loading && <p className="muted">Loading videos...</p>}

      {error && (
        <div className="error" data-testid="videos-error">
          <p>Could not load the video list: {error}</p>
          <p className="control-hint">
            Make sure the backend is running on port 8081, or start the dev
            server with <code>VITE_USE_MOCKS=true npm run dev</code>.
          </p>
        </div>
      )}

      {!loading && !error && videos.length === 0 && (
        <p className="muted">
          No videos found. Drop a file into the backend's{' '}
          <code>data/videos</code> directory.
        </p>
      )}

      <ul className="video-list" data-testid="video-list">
        {videos.map((filename) => (
          <li key={filename}>
            <Link to={`/preview/${encodeURIComponent(filename)}`} className="video-item">
              <span className="video-icon" aria-hidden="true" />
              <span className="video-name">{filename}</span>
              <span className="video-go">Preview</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
