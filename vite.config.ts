import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "release",
  },
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "在微信读书网页版中新增复制快捷键",
        icon: "https://weread.qq.com/favicon.ico",
        namespace:
          "https://greasyfork.org/zh-CN/scripts/497102-weread-copy-keymap",
        match: ["https://weread.qq.com/web/reader/*"],
        version: "0.0.5",
        description:
          "为微信读书网页版增加复制及复制并高亮快捷键，并支持在大图查看器中复制真实图片或下载原图。",
        author: "KazooTTT",
        homepage: "https://github.com/KazooTTT/weread-copy-keymap",
        license: "MIT",
        connect: ["res.weread.qq.com", "tencent-cloud.com"],
        grant: ["GM_xmlhttpRequest"],
      },
    }),
  ],
});
