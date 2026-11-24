import {
  storageGet,
  storageSet,
  setBadgeText,
  addItem,
  removeItem,
  moveItem,
  markRead,
  toggleFavorite,
  renderItems,
} from "./lib.js";

let currentItems = [];
let favoritesOnly = false;

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
  onToggleFavorite: (url) => {
    currentItems = toggleFavorite(currentItems, url);
    storageSet(currentItems);
    render();
  },
  onReorder: (fromUrl, toUrl) => {
    currentItems = moveItem(currentItems, fromUrl, toUrl);
    storageSet(currentItems);
    render();
  },
};

function render() {
  renderItems(
    currentItems,
    document.getElementById("search").value,
    handlers,
    favoritesOnly,
  );
}

function setView(value) {
  favoritesOnly = value;
  document
    .getElementById("view-all-btn")
    .classList.toggle("active", !favoritesOnly);
  document
    .getElementById("view-fav-btn")
    .classList.toggle("active", favoritesOnly);
  render();
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
document
  .getElementById("menu-btn")
  .addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("add-btn").addEventListener("click", addURL);
document.getElementById("search").addEventListener("input", render);
document.getElementById("view-all-btn").addEventListener("click", () => {
  setView(false);
});
document.getElementById("view-fav-btn").addEventListener("click", () => {
  setView(true);
});

async function init() {
  currentItems = await storageGet();
  render();
}

init();
