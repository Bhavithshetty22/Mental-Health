// vite.config.js - Enhanced version of your existing config

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  server: {
    // Proxy configuration (keeping your existing setup)
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // Add error handling for the proxy
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Proxy error:', err.message);
          });
        },
      }
    },
    
    // Add CORS headers to prevent some cross-origin issues
    cors: true,
    
    // Optional: specify port explicitly (you can remove this if you prefer default)
    port: 5173
  }
})