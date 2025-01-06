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
        version: "0.0.3",
        description:
          "在微信读书网页版中新增复制快捷键, 在 windows 下，快捷键为`Ctrl + C`，在 mac 下，快捷键为`Cmd + C`。",
        author: "KazooTTT",
        homepage: "https://github.com/KazooTTT/wereadCopyKeyMap",
        license: "MIT",
      },
    }),
  ],
});
