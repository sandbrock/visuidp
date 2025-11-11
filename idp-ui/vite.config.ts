import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: '/ui/',
  server: {
    port: 8083,
    host: '0.0.0.0', // Allow external connections
    allowedHosts: ['localhost', 'host.docker.internal'],
    proxy: {
      // Proxy API requests to the backend in development and attach dev auth headers
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        // Keep the /api prefix as backend is rooted at /api
        rewrite: (path) => path,
        headers: {
          // Dev-only headers to satisfy backend TraefikAuthenticationMechanism in local runs
          'X-Auth-Request-User': 'brandon.rock',
          'X-Auth-Request-Email': 'brandon.rock@angryss.com',
          'X-Auth-Request-Preferred-Username': 'brandon.rock',
          'X-Auth-Request-Groups': 'user',
        },
      },
    },
  },
  preview: {
    port: 8083,
    host: '0.0.0.0',
  },
  // Configure proxy for API calls when running in development
  // In production, Traefik will handle routing
  define: {
    __DEV__: JSON.stringify(command === 'serve'),
  },
}))
