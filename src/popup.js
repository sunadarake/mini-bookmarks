import { setupListView } from "./lib.js";
import { ICON_EXTERNAL_LINK } from "./icons.js";

const openTabBtn = document.getElementById("open-tab-btn");
openTabBtn.innerHTML = ICON_EXTERNAL_LINK;
openTabBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/tab.html") });
});

async function init() {
  const view = await setupListView();

  document.getElementById("add-btn").addEventListener("click", async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) return;

    const { url, title } = tabs[0];
    if (!url) return;

    view.add({ url, title });
  });
}

init();
