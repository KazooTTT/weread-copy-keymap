import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: ""
  },
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        icon: 'https://weread.qq.com/favicon.ico',
        namespace: 'weread-copy-keymap',
        match: ['https://weread.qq.com/web/reader/*'],
        version: '0.0.1',
        description: "在微信读书网页版中新增复制快捷键",
        author: "KazooTTT",
        homepage: "https://github.com/KazooTTT/wereadCopyKeyMap",
        license: 'MIT',
      },
    }),
  ],
});
