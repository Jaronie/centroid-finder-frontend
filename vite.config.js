import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Spring Boot backend runs on 8081 (8080 is taken by Apache on the dev
// machine -- see server/src/main/resources/application.properties).
//
// Everything backend-owned is proxied through the Vite dev server so the
// browser only ever talks to localhost:5173. That means we never need CORS
// headers on the Java side, and relative URLs like "/thumbnail/clip.mp4" work
// unchanged in dev and in production behind a single origin.
const BACKEND = 'http://localhost:8081';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': BACKEND,
      '/thumbnail': BACKEND,
      '/process': BACKEND,
      '/results': BACKEND,

      // CAREFUL: the backend serves the source videos statically at
      // /videos/**, but /videos is ALSO our Video Chooser route. A plain
      // '/videos' proxy entry would forward the page itself to the backend,
      // which answers 404 because no such file exists.
      //
      // Proxy keys starting with ^ are treated as regular expressions, so this
      // forwards /videos/testclip.mp4 (a file) while leaving /videos (the
      // page) to React Router.
      '^/videos/.+': BACKEND,
    },
  },
});
