// vite.config.js
import { defineConfig } from 'vite';
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
  }
});