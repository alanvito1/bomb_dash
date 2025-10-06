/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills()
  ],
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: [
        '**/playwright-report/**',
        '**/test-results/**',
        '**/.git/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/vite.config.js.timestamp-*.mjs',
        'vite.config.js'
      ]
    }
  },
  define: {
    global: 'globalThis'
  },
  test: {
    globals: true,
    environment: 'jsdom', // Use jsdom to simulate browser environment for tests
    include: ['src/**/*.test.js'], // Only run tests in the src directory
  },
});