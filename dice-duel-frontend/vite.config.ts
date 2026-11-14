import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/zama-relayer': {
        // 👈 New official relayer URL
        target: 'https://relayer.testnet.zama.org', 
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/zama-relayer/, ''),
        secure: true,
      },
    },
  },
})