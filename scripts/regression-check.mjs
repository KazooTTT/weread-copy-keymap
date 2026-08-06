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
  /textNode\.style\.flexDirection = "column"/,
  "keymap container must use a vertical layout"
);
assert.match(
  source,
  /if \(keyNode\.textContent !== text\)/,
  "unchanged keymap text must not retrigger the observer"
);
assert.match(
  source,
  /window\.addEventListener\(\s*"keydown"/,
  "keyboard shortcuts must run before page-level handlers"
);
assert.match(
  source,
  /copyImage\(imageUrl, imageCopyButton\)/,
  "Cmd/Ctrl+C must call clipboard logic directly inside the trusted event"
);
assert.doesNotMatch(
  source,
  /imageCopyButton\.click\(\)/,
  "Cmd/Ctrl+C must not proxy clipboard access through a synthetic click"
);

console.log("PASS: viewer navigation and keymap layout regression checks");
