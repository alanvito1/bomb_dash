// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
    // ... other config ...
    define: {
        'global': 'window' // Or an empty object {}
    },
    resolve: {
        alias: {
            buffer: 'buffer/'
        }
    }
});