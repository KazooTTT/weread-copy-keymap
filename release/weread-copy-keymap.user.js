// ==UserScript==
// @name         在微信读书网页版中新增复制快捷键
// @namespace    https://greasyfork.org/zh-CN/scripts/497102-weread-copy-keymap
// @version      0.0.4
// @author       KazooTTT
// @description  为微信读书网页版增加复制及复制并高亮快捷键，并支持在大图查看器中复制真实图片或下载原图。
// @license      MIT
// @icon         https://weread.qq.com/favicon.ico
// @homepage     https://github.com/KazooTTT/weread-copy-keymap
// @homepageURL  https://github.com/KazooTTT/weread-copy-keymap
// @match        https://weread.qq.com/web/reader/*
// @connect      res.weread.qq.com
// @connect      tencent-cloud.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  'use strict';

  const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  const COPY_KEY_TEXT = isMac ? "⌘ + C" : "Ctrl + C";
  const COPY_AND_HIGHLIGHT_KEY_TEXT = isMac ? "⌘ + X" : "Ctrl + X";
  const BUTTON_GROUP_CLASS = "wr-img-btn-group";
  let pending = false;
  const addKeyMapTitleToButton = (button, text) => {
    const textNode = button == null ? void 0 : button.querySelector(".toolbarItem_text");
    if (!textNode)
      return;
    let keyNode = textNode.querySelector(
      ".toolbarItem_text_keymap"
    );
    if (!keyNode) {
      keyNode = document.createElement("span");
      keyNode.className = "toolbarItem_text_keymap";
      keyNode.style.marginLeft = "2px";
      textNode.append(keyNode);
    }
    keyNode.textContent = text;
  };
  const initKeyMap = () => {
    addKeyMapTitleToButton(
      document.querySelector("button.toolbarItem.wr_copy"),
      COPY_KEY_TEXT
    );
    addKeyMapTitleToButton(
      document.querySelector("button.toolbarItem.underlineBg"),
      COPY_AND_HIGHLIGHT_KEY_TEXT
    );
  };
  const requestBlob = (url) => new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      responseType: "blob",
      timeout: 3e4,
      onload: ({ status, response }) => {
        if (status >= 200 && status < 300 && response instanceof Blob) {
          resolve(response);
          return;
        }
        reject(new Error(`图片请求失败（HTTP ${status}）`));
      },
      ontimeout: () => reject(new Error("图片请求超时")),
      onerror: () => reject(new Error("图片请求失败"))
    });
  });
  const blobToPng = async (sourceBlob) => {
    if (sourceBlob.type === "image/png")
      return sourceBlob;
    const bitmap = await createImageBitmap(sourceBlob);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("无法创建 Canvas 2D 上下文");
      context.drawImage(bitmap, 0, 0);
      return await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("图片转换为 PNG 失败")),
          "image/png"
        );
      });
    } finally {
      bitmap.close();
    }
  };
  const loadPngBlob = async (imageUrl) => {
    const sourceBlob = await requestBlob(imageUrl);
    if (!sourceBlob.type.startsWith("image/")) {
      throw new Error(
        `服务器返回的不是图片（${sourceBlob.type || "未知类型"}）`
      );
    }
    return blobToPng(sourceBlob);
  };
  const setButtonStatus = (button, text, resetAfter = 0) => {
    var _a;
    (_a = button.dataset).originalText || (_a.originalText = button.textContent || "");
    button.textContent = text;
    if (!resetAfter)
      return;
    window.setTimeout(() => {
      button.textContent = button.dataset.originalText || "";
      button.disabled = false;
    }, resetAfter);
  };
  const copyImage = async (imageUrl, button) => {
    var _a;
    if (!window.ClipboardItem || !((_a = navigator.clipboard) == null ? void 0 : _a.write)) {
      setButtonStatus(button, "浏览器不支持图片剪贴板", 2e3);
      return;
    }
    button.disabled = true;
    setButtonStatus(button, "复制中…");
    try {
      const item = new ClipboardItem({ "image/png": loadPngBlob(imageUrl) });
      await navigator.clipboard.write([item]);
      setButtonStatus(button, "已复制图片", 1500);
    } catch (error) {
      console.error("[Weread image copy]", error);
      setButtonStatus(
        button,
        error instanceof DOMException && error.name === "NotAllowedError" ? "请允许剪贴板权限" : "复制失败",
        2e3
      );
    }
  };
  const fileNameFromUrl = (imageUrl, mimeType) => {
    try {
      const name = decodeURIComponent(
        new URL(imageUrl).pathname.split("/").pop() || ""
      );
      if (name)
        return name;
    } catch {
    }
    return mimeType === "image/png" ? "weread-image.png" : "weread-image.jpg";
  };
  const downloadImage = async (imageUrl, button) => {
    button.disabled = true;
    setButtonStatus(button, "下载中…");
    try {
      const blob = await requestBlob(imageUrl);
      if (!blob.type.startsWith("image/")) {
        throw new Error("服务器返回的不是图片");
      }
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileNameFromUrl(imageUrl, blob.type);
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1e3);
      setButtonStatus(button, "已开始下载", 1500);
    } catch (error) {
      console.error("[Weread image download]", error);
      setButtonStatus(button, "下载失败", 2e3);
    }
  };
  const createButton = (text, color, hoverColor) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.style.cssText = `
    background: ${color}; color: #fff; border: 0; padding: 7px 15px;
    border-radius: 16px; font-size: 13px; line-height: 20px; cursor: pointer;
  `;
    button.addEventListener("mouseenter", () => {
      if (!button.disabled)
        button.style.background = hoverColor;
    });
    button.addEventListener("mouseleave", () => {
      button.style.background = color;
    });
    return button;
  };
  const initImageActions = () => {
    const viewer = document.querySelector(".viewer-canvas");
    const image = viewer == null ? void 0 : viewer.querySelector("img");
    if (!viewer || !image || viewer.querySelector(`.${BUTTON_GROUP_CLASS}`)) {
      return;
    }
    if (getComputedStyle(viewer).position === "static") {
      viewer.style.position = "relative";
    }
    const group = document.createElement("div");
    group.className = BUTTON_GROUP_CLASS;
    group.style.cssText = `
    position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%);
    z-index: 2147483647; display: flex; gap: 12px; padding: 8px 16px;
    border-radius: 22px; background: rgba(0, 0, 0, .75);
    backdrop-filter: blur(5px);
  `;
    for (const type of ["pointerdown", "mousedown", "mouseup", "click"]) {
      group.addEventListener(type, (event) => event.stopPropagation());
    }
    const copyButton = createButton("复制图片", "#388e3c", "#2e7d32");
    copyButton.addEventListener(
      "click",
      () => copyImage(image.currentSrc || image.src, copyButton)
    );
    const downloadButton = createButton("下载图片", "#1976d2", "#1565c0");
    downloadButton.addEventListener(
      "click",
      () => downloadImage(image.currentSrc || image.src, downloadButton)
    );
    group.append(copyButton, downloadButton);
    viewer.append(group);
  };
  const scheduleInit = () => {
    if (pending)
      return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      initKeyMap();
      initImageActions();
    });
  };
  document.addEventListener(
    "keydown",
    (event) => {
      const hasPrimaryModifier = isMac ? event.metaKey : event.ctrlKey;
      if (!hasPrimaryModifier || event.shiftKey || event.altKey)
        return;
      const key = event.key.toLowerCase();
      if (key === "c") {
        const imageCopyButton = document.querySelector(
          `.${BUTTON_GROUP_CLASS} button:first-child`
        );
        if (!imageCopyButton)
          return;
        event.preventDefault();
        event.stopPropagation();
        imageCopyButton.click();
        return;
      }
      if (key !== "x")
        return;
      const textCopyButton = document.querySelector(
        "button.toolbarItem.wr_copy"
      );
      const highlightButton = document.querySelector(
        "button.toolbarItem.underlineBg"
      );
      if (!textCopyButton || !highlightButton)
        return;
      event.preventDefault();
      event.stopPropagation();
      textCopyButton.click();
      window.setTimeout(() => highlightButton.click(), 100);
    },
    true
  );
  new MutationObserver(scheduleInit).observe(document.body, {
    childList: true,
    subtree: true
  });
  scheduleInit();

})();