// ==UserScript==
// @name         在微信读书网页版中新增复制快捷键
// @namespace    https://greasyfork.org/zh-CN/scripts/497102-weread-copy-keymap
// @version      0.0.3
// @author       KazooTTT
// @description  在微信读书网页版中新增复制快捷键, 在 windows 下，快捷键为`Ctrl + C`，在 mac 下，快捷键为`Cmd + C`。
// @license      MIT
// @icon         https://weread.qq.com/favicon.ico
// @homepage     https://github.com/KazooTTT/wereadCopyKeyMap
// @match        https://weread.qq.com/web/reader/*
// ==/UserScript==

(function () {
  'use strict';

  let hasRun = false;
  const initKeyMap = () => {
    const copyButton = document.querySelector(
      "#routerView > div > div.app_content > div.wr_various_font_provider_wrapper > div > div.renderTargetContainer > div.reader_toolbar_container > div > div > button.toolbarItem.wr_copy"
    );
    const addKeyMapTitleToButton = (button, textToAdd) => {
      const toolbarItem_text = button.querySelector(".toolbarItem_text");
      const toolbarItem_text_keymap = document.createElement("span");
      toolbarItem_text_keymap.className = "toolbarItem_text toolbarItem_text_keymap";
      toolbarItem_text_keymap.innerText = textToAdd;
      toolbarItem_text_keymap.style.marginLeft = "2px";
      toolbarItem_text == null ? void 0 : toolbarItem_text.append(toolbarItem_text_keymap);
    };
    if (copyButton) {
      const platform = navigator.platform.toLowerCase();
      let textToAdd = "";
      if (platform.includes("mac")) {
        textToAdd = "⌘ + c";
      } else {
        textToAdd = "ctrl + c";
      }
      addKeyMapTitleToButton(copyButton, textToAdd);
      hasRun = true;
      observer.disconnect();
    }
  };
  const observer = new MutationObserver((mutationsList) => {
    for (let mutation of mutationsList) {
      if (mutation.type === "childList" && !hasRun) {
        const targetNode = document.querySelector(
          ".renderTargetContainer > .reader_toolbar_container .reader_toolbar_content"
        );
        if (targetNode) {
          initKeyMap();
        }
      }
    }
  });
  const observerConfig = { childList: true, subtree: true };
  observer.observe(document.body, observerConfig);

})();