import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    // Gzip compression for production builds
    viteCompression({
      verbose: true,
      disable: mode !== 'production',
      threshold: 10240, // Only compress files larger than 10kb
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // Brotli compression for production builds (better compression than gzip)
    viteCompression({
      verbose: true,
      disable: mode !== 'production',
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  // Base path for CloudFront distribution
  // In production, CloudFront will serve from /ui/ path
  base: mode === 'production' ? '/ui/' : '/ui/',
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
          // Include the admin group UUID from .env to grant admin role in development
          'X-Auth-Request-Groups': '42057c4f-09f2-4b9c-bbd2-53e838b3bccb',
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
  build: {
    // Output directory for S3 deployment
    outDir: 'dist',
    // Generate source maps for debugging (can be disabled for production)
    sourcemap: mode === 'production' ? false : true,
    // Optimize chunk size for better caching
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks - rarely change, good for long-term caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Admin components - only loaded for admin users
          'admin': [
            './src/components/AdminDashboard.tsx',
            './src/components/CloudProviderManagement.tsx',
            './src/components/ResourceTypeManagement.tsx',
            './src/components/ResourceTypeMappingManagement.tsx',
            './src/components/PropertySchemaEditor.tsx',
          ],
          // API Keys management - separate chunk
          'api-keys': [
            './src/components/ApiKeysManagement.tsx',
            './src/components/ApiKeyCreateModal.tsx',
            './src/components/ApiKeyEditNameModal.tsx',
            './src/components/ApiKeyRevokeModal.tsx',
            './src/components/ApiKeyRotateModal.tsx',
            './src/components/ApiKeyAuditLogs.tsx',
          ],
        },
        // Asset file naming with hash for cache busting
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          const ext = info?.[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/i.test(ext || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        // Chunk file naming with hash for cache busting
        chunkFileNames: 'assets/js/[name]-[hash].js',
        // Entry file naming with hash for cache busting
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Minification settings
    minify: mode === 'production' ? 'terser' : 'esbuild',
    // Chunk size warning limit (500kb)
    chunkSizeWarningLimit: 500,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Asset inlining threshold (4kb)
    assetsInlineLimit: 4096,
    // Target modern browsers for smaller bundle
    target: 'es2022',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
}))
