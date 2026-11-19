import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // NOTE: a proxy key has to start with "/". Vite matches it against the
      // request path, and "/api/videos" does not start with "api", so the
      // key without the slash never matched and the video list 404ed.
      '/api': 'http://localhost:8081',
      '/thumbnail': 'http://localhost:8081',

      // "/process" and "/results" go here
      '/process': 'http://localhost:8081',
      '/results': 'http://localhost:8081',

      // CAREFUL: the backend also serves the source videos statically at
      // /videos/**, but /videos is ALSO our Video Chooser route. A plain
      // '/videos' entry would forward the page itself to the backend, which
      // answers 404 because no such file exists.
      //
      // Keys starting with ^ are treated as regular expressions, so this
      // forwards /videos/testclip.mp4 (a file) while leaving /videos (the
      // page) to React Router.
      '^/videos/.+': 'http://localhost:8081',
    },
  },
});
