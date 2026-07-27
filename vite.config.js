import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'suppress-swiper-css-warning',
      configResolved(config) {
        const originalWarn = config.logger.warn
        config.logger.warn = (msg) => {
          if (typeof msg === 'string' && msg.includes('Nested CSS was detected')) {
            return
          }
          originalWarn(msg)
        }
      },
    },
  ],
})
