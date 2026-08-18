import { defineConfig } from "bumpp";

export default defineConfig({
  files: ["package.json", "vite.config.ts"],
  commit: "chore: release {tag}",
  tag: "v{version}",
  push: true,
  all: true,
  execute: "pnpm release:prepare",
});
