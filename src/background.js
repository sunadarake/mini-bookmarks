const STORAGE_KEY = "MiniBookMark_Items";
const MIGRATION_KEY = "MiniBookMark_isMigration";

async function setBadge() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const items = data[STORAGE_KEY] || [];
  chrome.action.setBadgeText({ text: items.length.toString() });
}

async function updateStorage() {
  const migrationData = await chrome.storage.local.get(MIGRATION_KEY);
  if (MIGRATION_KEY in migrationData) return;

  const data = await chrome.storage.sync.get("items");
  if (data.items) {
    chrome.storage.local.set({ [STORAGE_KEY]: data.items });
  }
  chrome.storage.local.set({ [MIGRATION_KEY]: 1 });
}

chrome.runtime.onStartup.addListener(() => {
  setBadge();
});

chrome.runtime.onInstalled.addListener(() => {
  updateStorage();
  setBadge();
});
