import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env

// GitHub Pages + Synology Web Station both serve under /MEM-AIVisdefect/.
// Override with VITE_BASE=./ for a NAS nginx root (port 8088).
export default defineConfig({
  base: env?.VITE_BASE || '/MEM-AIVisdefect/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
      },
    },
  },
})
