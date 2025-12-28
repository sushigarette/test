import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/kpi/',
  server: {
    proxy: {
      '/kpi/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kpi\/api/, '/api'),
      },
    },
  },
})

