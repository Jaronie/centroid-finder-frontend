/**
 * Vite's dev-time HMR client references a __WS_TOKEN__ global that the dev
 * server normally defines at transform time. When Cypress loads the page
 * through its own proxy that define is missing, and the client throws
 * "__WS_TOKEN__ is not defined" before any of our code runs.
 *
 * It comes from the dev server's hot-reload plumbing, not from the app -- the
 * production build does not include it at all. Only that one error is
 * swallowed, so any genuine uncaught exception still fails the test.
 */
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('__WS_TOKEN__')) return false;
  return true;
});
