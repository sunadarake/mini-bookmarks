import { setupListView } from "./lib.js";

document.getElementById("open-tab-btn").addEventListener("click", () => {
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
