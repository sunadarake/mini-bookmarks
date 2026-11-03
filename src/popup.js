import {
  storageGet,
  storageSet,
  setBadgeText,
  addItem,
  removeItem,
  markRead,
  renderItems,
} from "./lib.js";

let currentItems = [];

const handlers = {
  onOpen: (url) => {
    currentItems = markRead(currentItems, url);
    storageSet(currentItems);
    render();
  },
  onDelete: (url) => {
    currentItems = removeItem(currentItems, url);
    storageSet(currentItems);
    setBadgeText(currentItems);
    render();
  },
};

function render() {
  renderItems(currentItems, document.getElementById("search").value, handlers);
}

async function addURL() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) return;

  const { url, title } = tabs[0];
  if (!url) return;

  currentItems = addItem(currentItems, { url, title });
  storageSet(currentItems);
  setBadgeText(currentItems);
  render();
}

document.getElementById("open-tab-btn").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/tab.html") });
});
document.getElementById("add-btn").addEventListener("click", addURL);
document.getElementById("search").addEventListener("input", render);

async function init() {
  currentItems = await storageGet();
  render();
}

init();
