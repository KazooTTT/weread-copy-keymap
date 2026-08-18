import { defineConfig } from "bumpp";

export default defineConfig({
  files: ["package.json", "vite.config.ts"],
  commit: "chore: release {tag}",
  tag: "v{version}",
  push: true,
  execute:
    "pnpm test && pnpm build && git add release/weread-copy-keymap.user.js",
});
