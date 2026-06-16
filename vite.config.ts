import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 配信時はリポジトリ名を base に設定する。
// 例: https://<user>.github.io/toy-mania-web/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? '/toy-mania-web/' : '/',
});
