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
            // ECharts - 大体积独立库，无 React 依赖
            if (id.includes('/echarts/') || id.includes('/zrender/')) {
              return 'echarts'
            }
            // xlsx - 大体积独立库，无 React 依赖
            if (id.includes('/xlsx/')) {
              return 'xlsx'
            }
            // 其他所有 node_modules 放一起，避免循环依赖
            return 'vendor'
          }
        },
      },
    },
  },
})
