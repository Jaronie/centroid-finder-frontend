import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  // The Mocha unit tests run in Node, not the browser, and use the BDD
  // globals (describe/it) that Mocha injects.
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.mocha },
    },
  },

  // Cypress specs use the same BDD globals plus cy/Cypress/expect.
  {
    files: ['cypress/**/*.js'],
    languageOptions: {
      globals: { ...globals.mocha, cy: 'readonly', Cypress: 'readonly', expect: 'readonly' },
    },
  },

  // Config files run in Node.
  {
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
])
