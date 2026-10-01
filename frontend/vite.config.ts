import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server proxies to the development backend (docker-compose.dev.yml, port 8001),
// never to production. Override with VITE_API_PROXY_TARGET if needed.
const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8001'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true
      },
      '/uploads': {
        target: apiTarget,
        changeOrigin: true
      },
      // Same feed URLs as Nginx in production
      '^/feed\\.xml$': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: () => '/api/v1/feed.xml'
      },
      '^/[a-z0-9-]+/feed\\.xml$': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/([a-z0-9-]+)\/feed\.xml$/, '/api/v1/sections/$1/feed.xml')
      }
    }
  }
})
