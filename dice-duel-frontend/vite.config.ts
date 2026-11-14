import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  base: '/confidential-dice-duel/', 
  server: {
    proxy: {
      '/zama-relayer': {
        target: 'https://relayer.testnet.zama.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/zama-relayer/, ''),
        secure: true,
      },
    },
  },
})