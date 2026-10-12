import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages 子路径:/daily-checkin-originos/
  base: '/daily-checkin-originos/',
  // 版本号单一来源:package.json
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  server: {
    port: 3000,
    host: true,
    // 忽略编辑器/工具原子写入产生的临时文件,避免 Windows 下 EBUSY 使监听器崩溃
    // .shots 是本地无头浏览器验证产物目录（含 Edge 配置），其中的 Cookies 等文件被
    // 浏览器锁住时会让 chokidar 抛 EBUSY 直接崩掉 dev server
    watch: {
      ignored: ['**/*.tmpdir/**', '**/*.tmp', '**/.git/**', '**/.shots/**', '**/release/**']
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})
