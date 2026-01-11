import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'gzip',
      ext: '.gz',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // UI libraries (React + AntD) to avoid circular dependencies
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/') ||
              id.includes('/antd/') || id.includes('/@ant-design/') || id.includes('/rc-') || id.includes('/dayjs/')) {
              return 'ui-libs'
            }
            // ECharts & dependencies
            if (id.includes('/echarts/') || id.includes('/zrender/') || id.includes('/echarts-for-react/')) {
              return 'echarts'
            }
            // Utilities
            if (id.includes('/lodash/') || id.includes('/lodash-es/')) {
              return 'lodash'
            }
            if (id.includes('/xlsx/')) {
              return 'xlsx'
            }
            // other vendors
            return 'vendor'
          }
        },
      },
    },
  },
})
