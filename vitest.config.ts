import { defineConfig } from 'vitest/config'
import path from 'path'

// Workspace-style config: per-file environment via environmentMatchGlobs so
// pure-logic tests run fast under node, while React component tests get jsdom.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'lib/**/*.test.ts',
      'lib/**/*.test.tsx',
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'components/**/*.test.tsx',
    ],
    environmentMatchGlobs: [
      ['components/**/*.test.tsx', 'jsdom'],
      ['lib/**/*.test.tsx', 'jsdom'],
      ['tests/**/*.test.tsx', 'jsdom'],
    ],
  },
})
