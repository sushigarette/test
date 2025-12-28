import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy pour contourner les problèmes CORS
      '/api': {
        target: 'https://mhlink.elivie.fr',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Erreur proxy:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Requête proxy:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Réponse proxy:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
})

