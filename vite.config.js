import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'es2020',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split large game components into separate chunks for better caching
          if (id.includes('components/BrickBreakerGame')) return 'brick-breaker'
          if (id.includes('components/DrawGame')) return 'draw-game'
          if (id.includes('lib/scorer')) return 'scorer'
        },
      },
    },
  },
})
