// @ts-ignore isolatedModules

type GMResponse = {
  status: number;
  response: Blob | string;
  responseText?: string;
};

declare function GM_xmlhttpRequest(details: {
  method: "GET";
  url: string;
  responseType: "blob" | "text";
  timeout: number;
  onload: (response: GMResponse) => void;
  ontimeout: () => void;
  onerror: () => void;
}): void;

const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
const COPY_KEY_TEXT = isMac ? "⌘ + C" : "Ctrl + C";
const COPY_AND_HIGHLIGHT_KEY_TEXT = isMac ? "⌘ + X" : "Ctrl + X";
const BUTTON_GROUP_CLASS = "wr-img-btn-group";
const DOUBAN_BUTTON_ID = "wr-douban-link";

let pending = false;

const addKeyMapTitleToButton = (
  button: HTMLButtonElement | null,
  text: string
) => {
  const textNode = button?.querySelector<HTMLElement>(".toolbarItem_text");
  if (!textNode) return;

  textNode.style.display = "flex";
  textNode.style.flexDirection = "column";
  textNode.style.alignItems = "center";

  let keyNode = textNode.querySelector<HTMLElement>(
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
    document.querySelector<HTMLButtonElement>("button.toolbarItem.wr_copy"),
    COPY_KEY_TEXT
  );
  addKeyMapTitleToButton(
    document.querySelector<HTMLButtonElement>("button.toolbarItem.underlineBg"),
    COPY_AND_HIGHLIGHT_KEY_TEXT
  );
};

const requestBlob = (url: string) =>
  new Promise<Blob>((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      responseType: "blob",
      timeout: 30_000,
      onload: ({ status, response }) => {
        if (status >= 200 && status < 300 && response instanceof Blob) {
          resolve(response);
          return;
        }
        reject(new Error(`图片请求失败（HTTP ${status}）`));
      },
      ontimeout: () => reject(new Error("图片请求超时")),
      onerror: () => reject(new Error("图片请求失败")),
    });
  });

const requestText = (url: string) =>
  new Promise<string>((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      responseType: "text",
      timeout: 15_000,
      onload: ({ status, response, responseText }) => {
        if (status >= 200 && status < 300) {
          resolve(typeof response === "string" ? response : responseText || "");
          return;
        }
        reject(new Error(`豆瓣搜索失败（HTTP ${status}）`));
      },
      ontimeout: () => reject(new Error("豆瓣搜索超时")),
      onerror: () => reject(new Error("豆瓣搜索失败")),
    });
  });

const blobToPng = async (sourceBlob: Blob) => {
  if (sourceBlob.type === "image/png") return sourceBlob;

  const bitmap = await createImageBitmap(sourceBlob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法创建 Canvas 2D 上下文");

    context.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("图片转换为 PNG 失败")),
        "image/png"
      );
    });
  } finally {
    bitmap.close();
  }
};

const loadPngBlob = async (imageUrl: string) => {
  const sourceBlob = await requestBlob(imageUrl);
  if (!sourceBlob.type.startsWith("image/")) {
    throw new Error(
      `服务器返回的不是图片（${sourceBlob.type || "未知类型"}）`
    );
  }
  return blobToPng(sourceBlob);
};

const setButtonStatus = (
  button: HTMLButtonElement,
  text: string,
  resetAfter = 0
) => {
  button.dataset.originalText ||= button.textContent || "";
  button.textContent = text;
  if (!resetAfter) return;

  window.setTimeout(() => {
    button.textContent = button.dataset.originalText || "";
    button.disabled = false;
  }, resetAfter);
};

const copyImage = async (imageUrl: string, button: HTMLButtonElement) => {
  if (!window.ClipboardItem || !navigator.clipboard?.write) {
    setButtonStatus(button, "浏览器不支持图片剪贴板", 2_000);
    return;
  }

  button.disabled = true;
  setButtonStatus(button, "复制中…");

  try {
    // 在点击产生的用户授权尚有效时立即调用 write；图片可异步下载和转换。
    const item = new ClipboardItem({ "image/png": loadPngBlob(imageUrl) });
    await navigator.clipboard.write([item]);
    setButtonStatus(button, "已复制图片", 1_500);
  } catch (error) {
    console.error("[Weread image copy]", error);
    setButtonStatus(
      button,
      error instanceof DOMException && error.name === "NotAllowedError"
        ? "请允许剪贴板权限"
        : "复制失败",
      2_000
    );
  }
};

const fileNameFromUrl = (imageUrl: string, mimeType: string) => {
  try {
    const name = decodeURIComponent(
      new URL(imageUrl).pathname.split("/").pop() || ""
    );
    if (name) return name;
  } catch {
    // 使用默认文件名。
  }
  return mimeType === "image/png" ? "weread-image.png" : "weread-image.jpg";
};

const downloadImage = async (imageUrl: string, button: HTMLButtonElement) => {
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
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    setButtonStatus(button, "已开始下载", 1_500);
  } catch (error) {
    console.error("[Weread image download]", error);
    setButtonStatus(button, "下载失败", 2_000);
  }
};

const createButton = (text: string, color: string, hoverColor: string) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.style.cssText = `
    background: ${color}; color: #fff; border: 0; padding: 7px 15px;
    border-radius: 16px; font-size: 13px; line-height: 20px; cursor: pointer;
  `;
  button.addEventListener("mouseenter", () => {
    if (!button.disabled) button.style.background = hoverColor;
  });
  button.addEventListener("mouseleave", () => {
    button.style.background = color;
  });
  return button;
};

const getViewerImageUrl = (viewer: HTMLElement) => {
  const image = viewer.querySelector<HTMLImageElement>("img");
  return image?.currentSrc || image?.src || "";
};

const initViewerImageActions = (viewer: HTMLElement) => {
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
    if (imageUrl) copyImage(imageUrl, copyButton);
  });

  const downloadButton = createButton("下载图片", "#1976d2", "#1565c0");
  downloadButton.addEventListener("click", () => {
    const imageUrl = getViewerImageUrl(viewer);
    if (imageUrl) downloadImage(imageUrl, downloadButton);
  });

  group.append(copyButton, downloadButton);
  viewer.append(group);
};

const initImageActions = () => {
  document
    .querySelectorAll<HTMLElement>(".viewer-canvas")
    .forEach(initViewerImageActions);
};

type BookMetadata = {
  name: string;
  author: string;
  isbn: string;
};

const getPageTitle = () => {
  const pageTitle = document.title
    .replace(/\s*[-–—|]\s*微信读书\s*$/, "")
    .trim();
  return pageTitle && pageTitle !== "微信读书" ? pageTitle : "";
};

const getBookMetadata = (): BookMetadata => {
  for (const script of Array.from(
    document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')
  )) {
    try {
      const data = JSON.parse(script.textContent || "");
      const candidates = Array.isArray(data)
        ? data
        : Array.isArray(data?.["@graph"])
          ? data["@graph"]
          : [data];
      const book = candidates.find((item) => item?.["@type"] === "Book");
      if (!book) continue;

      const author = Array.isArray(book.author) ? book.author[0] : book.author;
      return {
        name: typeof book.name === "string" ? book.name.trim() : "",
        author: typeof author?.name === "string" ? author.name.trim() : "",
        isbn: typeof book.isbn === "string" ? book.isbn.trim() : "",
      };
    } catch {
      // 忽略无效的 JSON-LD，继续尝试页面中的其他元数据。
    }
  }
  return { name: getPageTitle(), author: "", isbn: "" };
};

const createDoubanSearchUrl = ({ name, author, isbn }: BookMetadata) => {
  const searchText = isbn || [name, author].filter(Boolean).join(" - ");
  return searchText
    ? `https://search.douban.com/book/subject_search?search_text=${encodeURIComponent(searchText)}`
    : "";
};

const findUniqueDoubanSubject = (html: string) => {
  const document = new DOMParser().parseFromString(html, "text/html");
  const subjectUrls = new Set<string>();

  for (const anchor of Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
    try {
      const url = new URL(anchor.href, "https://search.douban.com");
      const match = url.pathname.match(/^\/subject\/(\d+)\/?$/);
      if (url.hostname === "book.douban.com" && match) {
        subjectUrls.add(`https://book.douban.com/subject/${match[1]}/`);
      }
    } catch {
      // 忽略无效链接。
    }
  }

  return subjectUrls.size === 1 ? subjectUrls.values().next().value || "" : "";
};

const resolveDoubanTarget = async (searchUrl: string) => {
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
    existingLink?.remove();
    return;
  }
  if (existingLink instanceof HTMLAnchorElement && existingLink.href === doubanUrl) return;
  existingLink?.remove();

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
    if (!targetWindow) return;

    resolveDoubanTarget(doubanUrl).then((targetUrl) => {
      targetWindow.location.href = targetUrl;
    });
  });
  document.body.append(link);
};

const getVisibleImageCopyButton = () =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      `.${BUTTON_GROUP_CLASS} button:first-child`
    )
  ).find((button) => button.getClientRects().length > 0);

const scheduleInit = () => {
  if (pending) return;
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
    if (!hasPrimaryModifier || event.shiftKey || event.altKey) return;

    const key = event.key.toLowerCase();

    if (key === "c") {
      const imageCopyButton = getVisibleImageCopyButton();
      if (!imageCopyButton) return;

      const viewer = imageCopyButton.closest<HTMLElement>(".viewer-canvas");
      const imageUrl = viewer ? getViewerImageUrl(viewer) : "";
      if (!imageUrl) return;

      event.preventDefault();
      event.stopPropagation();
      copyImage(imageUrl, imageCopyButton);
      return;
    }

    if (key !== "x") return;

    const textCopyButton = document.querySelector<HTMLButtonElement>(
      "button.toolbarItem.wr_copy"
    );
    const highlightButton = document.querySelector<HTMLButtonElement>(
      "button.toolbarItem.underlineBg"
    );
    if (!textCopyButton || !highlightButton) return;

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
  attributeFilter: ["src", "class", "style"],
});
scheduleInit();
