import { Routes, Route, Navigate, Link } from 'react-router-dom';
import VideoChooser from './pages/VideoChooser.jsx';
import VideoPreview from './pages/VideoPreview.jsx';
import { USE_MOCKS } from './api/client.js';

/**
 * Route table. The two required routes are /videos and /preview/:filename;
 * "/" just redirects to the chooser so the app has a sensible landing page.
 *
 * The filename sits in the URL as a route param, which is what makes a preview
 * page shareable and reloadable -- the page reads it with useParams rather than
 * receiving it through state from the chooser.
 */
export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/videos" className="brand">
          <span className="brand-dot" aria-hidden="true" />
          Centroid Finder
        </Link>
        {USE_MOCKS && (
          <span className="mock-badge" title="VITE_USE_MOCKS=true">
            mock data
          </span>
        )}
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/videos" replace />} />
          <Route path="/videos" element={<VideoChooser />} />
          <Route path="/preview/:filename" element={<VideoPreview />} />
          <Route
            path="*"
            element={
              <div className="card">
                <h2>Page not found</h2>
                <Link to="/videos">Back to videos</Link>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
