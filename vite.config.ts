import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('heic2any')) return 'heic2any'
          if (id.includes('utif')) return 'utif'
          if (id.includes('gifenc')) return 'gifenc'
        },
      },
    },
  },
})
