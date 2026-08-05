# 微信读书网页版复制快捷键

![cover](https://pictures.kazoottt.top/2024/06/20240605-f9f1fd7eec262178e50fb61695d12535.png)

这是一个油猴脚本，用于在微信读书网页端显示复制、复制并高亮快捷键，并在打开大图时复制或下载图片。

在 windows 下，快捷键为`Ctrl + C`，在 mac 下，快捷键为`Cmd + C`。

选中文本后，使用 `Ctrl + X`（Windows）或 `Cmd + X`（macOS），脚本会先复制文本，再执行高亮。

## 图片操作

打开阅读器中的大图后，底部会显示“复制图片”和“下载图片”按钮：

- “复制图片”会把真正的 `image/png` 图像对象写入剪贴板，不会复制图片 URL。
- “下载图片”会保存服务器返回的原始图片。
- 大图打开时也可以使用 `Ctrl + C` 或 `Cmd + C` 复制图片。

脚本通过 `GM_xmlhttpRequest` 读取微信读书图片，并允许图片 CDN 重定向到 `tencent-cloud.com` 子域名。首次使用时，Tampermonkey 或浏览器可能会询问域名访问及剪贴板权限。

## 相关地址

[下载地址](https://greasyfork.org/zh-CN/scripts/497102-weread-copy-keymap)

[源代码](https://github.com/KazooTTT/weread-copy-keymap)

---

本项目使用模板为 [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey)
