// @ts-ignore isolatedModules

let hasRun = false;

const initKeyMap = () => {
  const copyButton = document.querySelector(
    "#routerView > div > div.app_content > div.wr_various_font_provider_wrapper > div > div.renderTargetContainer > div.reader_toolbar_container > div > div > button.toolbarItem.wr_copy"
  );

  const addKeyMapTitleToButton = (
    button: HTMLButtonElement,
    textToAdd: string
  ) => {
    const toolbarItem_text = button.querySelector(".toolbarItem_text");
    const toolbarItem_text_keymap = document.createElement("span");
    toolbarItem_text_keymap.className =
      "toolbarItem_text toolbarItem_text_keymap";
    toolbarItem_text_keymap.innerText = textToAdd;
    toolbarItem_text_keymap.style.marginLeft = "2px";
    toolbarItem_text?.append(toolbarItem_text_keymap);
  };

  if (copyButton) {
    // detect is windows or mac
    const platform = navigator.platform.toLowerCase();

    let textToAdd = "";
    if (platform.includes("mac")) {
      textToAdd = "⌘ + c";
    } else {
      textToAdd = "ctrl + c";
    }
    addKeyMapTitleToButton(copyButton as HTMLButtonElement, textToAdd);

    hasRun = true;
    // after run, cancel the observer

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
