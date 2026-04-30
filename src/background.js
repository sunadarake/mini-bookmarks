const STORAGE_KEY = "MiniBookMark_Items";

async function setBadge() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const items = data[STORAGE_KEY] || [];
  chrome.action.setBadgeText({ text: items.length.toString() });
}

chrome.runtime.onStartup.addListener(() => {
  setBadge();
});

chrome.runtime.onInstalled.addListener(() => {
  setBadge();
});
