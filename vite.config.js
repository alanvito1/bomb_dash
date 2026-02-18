/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
        process: true,
      },
      protocolImports: true,
    }),
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
        'vite.config.js',
      ],
    },
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  optimizeDeps: {
    exclude: ['@sentry/browser'],
  },
  build: {
    rollupOptions: {
      external: ['@sentry/browser'],
      input: {
        main: resolve(__dirname, 'index.html'),
        whitepaper: resolve(__dirname, 'whitepaper.html'),
        lore: resolve(__dirname, 'lore.html'),
        wiki: resolve(__dirname, 'wiki.html'),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom', // Use jsdom to simulate browser environment for tests
    include: ['src/**/*.test.js'], // Only run tests in the src directory
  },
});
