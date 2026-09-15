import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 前端在 web/，构建产物输出到 dist/，由 serve.js 提供（含 /api 归档与 /v1 代理）。
// dev 模式下 Vite 把 /api 与 /v1 代理到本地服务（默认 9119），保持同源。
export default defineConfig({
  root: 'web',
  plugins: [react(), tailwindcss()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:9119', changeOrigin: true },
      '/v1': { target: 'http://localhost:9119', changeOrigin: true },
    },
  },
});
