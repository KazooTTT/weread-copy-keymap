// ==UserScript==
// @name         在微信读书网页版中新增复制快捷键
// @namespace    https://greasyfork.org/zh-CN/scripts/497102-weread-copy-keymap
// @version      0.0.8
// @author       KazooTTT
// @description  为微信读书网页版增加复制快捷键、图片操作和豆瓣图书跳转。
// @license      MIT
// @icon         https://weread.qq.com/favicon.ico
// @homepage     https://github.com/KazooTTT/weread-copy-keymap
// @homepageURL  https://github.com/KazooTTT/weread-copy-keymap
// @match        https://weread.qq.com/web/reader/*
// @connect      res.weread.qq.com
// @connect      tencent-cloud.com
// @connect      search.douban.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  'use strict';

  const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  const COPY_KEY_TEXT = isMac ? "⌘ + C" : "Ctrl + C";
  const COPY_AND_HIGHLIGHT_KEY_TEXT = isMac ? "⌘ + X" : "Ctrl + X";
  const BUTTON_GROUP_CLASS = "wr-img-btn-group";
  const DOUBAN_BUTTON_ID = "wr-douban-link";
  let pending = false;
  const addKeyMapTitleToButton = (button, text) => {
    const textNode = button == null ? void 0 : button.querySelector(".toolbarItem_text");
    if (!textNode)
      return;
    textNode.style.display = "flex";
    textNode.style.flexDirection = "column";
    textNode.style.alignItems = "center";
    let keyNode = textNode.querySelector(
      ".toolbarItem_text_keymap"
    );
    if (!keyNode) {
      keyNode = document.createElement("span");
      keyNode.className = "toolbarItem_text toolbarItem_text_keymap";
      keyNode.style.display = "block";
      keyNode.style.whiteSpace = "nowrap";
      textNode.append(keyNode);
    }
    if (keyNode.textContent !== text) {
      keyNode.textContent = text;
    }
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
  const requestText = (url) => new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      responseType: "text",
      timeout: 15e3,
      onload: ({ status, response, responseText }) => {
        if (status >= 200 && status < 300) {
          resolve(typeof response === "string" ? response : responseText || "");
          return;
        }
        reject(new Error(`豆瓣搜索失败（HTTP ${status}）`));
      },
      ontimeout: () => reject(new Error("豆瓣搜索超时")),
      onerror: () => reject(new Error("豆瓣搜索失败"))
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
  const getViewerImageUrl = (viewer) => {
    const image = viewer.querySelector("img");
    return (image == null ? void 0 : image.currentSrc) || (image == null ? void 0 : image.src) || "";
  };
  const initViewerImageActions = (viewer) => {
    if (!getViewerImageUrl(viewer) || viewer.querySelector(`.${BUTTON_GROUP_CLASS}`)) {
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
    copyButton.addEventListener("click", () => {
      const imageUrl = getViewerImageUrl(viewer);
      if (imageUrl)
        copyImage(imageUrl, copyButton);
    });
    const downloadButton = createButton("下载图片", "#1976d2", "#1565c0");
    downloadButton.addEventListener("click", () => {
      const imageUrl = getViewerImageUrl(viewer);
      if (imageUrl)
        downloadImage(imageUrl, downloadButton);
    });
    group.append(copyButton, downloadButton);
    viewer.append(group);
  };
  const initImageActions = () => {
    document.querySelectorAll(".viewer-canvas").forEach(initViewerImageActions);
  };
  const getPageTitle = () => {
    const pageTitle = document.title.replace(/\s*[-–—|]\s*微信读书\s*$/, "").trim();
    return pageTitle && pageTitle !== "微信读书" ? pageTitle : "";
  };
  const getBookMetadata = () => {
    for (const script of Array.from(
      document.querySelectorAll('script[type="application/ld+json"]')
    )) {
      try {
        const data = JSON.parse(script.textContent || "");
        const candidates = Array.isArray(data) ? data : Array.isArray(data == null ? void 0 : data["@graph"]) ? data["@graph"] : [data];
        const book = candidates.find((item) => (item == null ? void 0 : item["@type"]) === "Book");
        if (!book)
          continue;
        const author = Array.isArray(book.author) ? book.author[0] : book.author;
        return {
          name: typeof book.name === "string" ? book.name.trim() : "",
          author: typeof (author == null ? void 0 : author.name) === "string" ? author.name.trim() : "",
          isbn: typeof book.isbn === "string" ? book.isbn.trim() : ""
        };
      } catch {
      }
    }
    return { name: getPageTitle(), author: "", isbn: "" };
  };
  const createDoubanSearchUrl = ({ name, author, isbn }) => {
    const searchText = isbn || [name, author].filter(Boolean).join(" - ");
    return searchText ? `https://search.douban.com/book/subject_search?search_text=${encodeURIComponent(searchText)}` : "";
  };
  const findUniqueDoubanSubject = (html) => {
    const document2 = new DOMParser().parseFromString(html, "text/html");
    const subjectUrls = /* @__PURE__ */ new Set();
    for (const anchor of Array.from(document2.querySelectorAll("a[href]"))) {
      try {
        const url = new URL(anchor.href, "https://search.douban.com");
        const match = url.pathname.match(/^\/subject\/(\d+)\/?$/);
        if (url.hostname === "book.douban.com" && match) {
          subjectUrls.add(`https://book.douban.com/subject/${match[1]}/`);
        }
      } catch {
      }
    }
    return subjectUrls.size === 1 ? subjectUrls.values().next().value || "" : "";
  };
  const resolveDoubanTarget = async (searchUrl) => {
    try {
      return findUniqueDoubanSubject(await requestText(searchUrl)) || searchUrl;
    } catch (error) {
      console.error("[Weread Douban search]", error);
      return searchUrl;
    }
  };
  const initDoubanLink = () => {
    const book = getBookMetadata();
    const doubanUrl = createDoubanSearchUrl(book);
    const existingLink = document.getElementById(DOUBAN_BUTTON_ID);
    if (!doubanUrl) {
      existingLink == null ? void 0 : existingLink.remove();
      return;
    }
    if (existingLink instanceof HTMLAnchorElement && existingLink.href === doubanUrl)
      return;
    existingLink == null ? void 0 : existingLink.remove();
    const link = document.createElement("a");
    link.id = DOUBAN_BUTTON_ID;
    link.href = doubanUrl;
    link.target = "wr-douban-target";
    link.rel = "noopener noreferrer";
    link.textContent = "去豆瓣查看";
    link.title = `在豆瓣查找《${book.name || getPageTitle()}》`;
    link.style.cssText = `
    position: fixed; top: 18px; right: 72px; z-index: 2147483647;
    display: inline-flex; align-items: center; height: 32px; padding: 0 14px;
    border-radius: 16px; background: #00a65a; color: #fff;
    font-size: 13px; font-weight: 500; text-decoration: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .16);
  `;
    link.addEventListener("mouseenter", () => {
      link.style.background = "#008f4c";
    });
    link.addEventListener("mouseleave", () => {
      link.style.background = "#00a65a";
    });
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const targetWindow = window.open(doubanUrl, "wr-douban-target");
      if (!targetWindow)
        return;
      resolveDoubanTarget(doubanUrl).then((targetUrl) => {
        targetWindow.location.href = targetUrl;
      });
    });
    document.body.append(link);
  };
  const getVisibleImageCopyButton = () => Array.from(
    document.querySelectorAll(
      `.${BUTTON_GROUP_CLASS} button:first-child`
    )
  ).find((button) => button.getClientRects().length > 0);
  const scheduleInit = () => {
    if (pending)
      return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      initKeyMap();
      initImageActions();
      initDoubanLink();
    });
  };
  window.addEventListener(
    "keydown",
    (event) => {
      const hasPrimaryModifier = isMac ? event.metaKey : event.ctrlKey;
      if (!hasPrimaryModifier || event.shiftKey || event.altKey)
        return;
      const key = event.key.toLowerCase();
      if (key === "c") {
        const imageCopyButton = getVisibleImageCopyButton();
        if (!imageCopyButton)
          return;
        const viewer = imageCopyButton.closest(".viewer-canvas");
        const imageUrl = viewer ? getViewerImageUrl(viewer) : "";
        if (!imageUrl)
          return;
        event.preventDefault();
        event.stopPropagation();
        copyImage(imageUrl, imageCopyButton);
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
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "class", "style"]
  });
  scheduleInit();

})();