import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");

assert.match(
  source,
  /querySelectorAll<HTMLElement>\("\.viewer-canvas"\)/,
  "all viewer canvases must be initialized after page navigation"
);
assert.match(
  source,
  /attributes:\s*true/,
  "viewer attribute changes must trigger re-initialization"
);
assert.match(
  source,
  /keyNode\.className = "toolbarItem_text toolbarItem_text_keymap"/,
  "keymap label must retain WeRead's line-layout class"
);
assert.match(
  source,
  /keyNode\.style\.display = "block"/,
  "keymap label must start on a new line"
);
assert.match(
  source,
  /if \(keyNode\.textContent !== text\)/,
  "unchanged keymap text must not retrigger the observer"
);

console.log("PASS: viewer navigation and keymap layout regression checks");
