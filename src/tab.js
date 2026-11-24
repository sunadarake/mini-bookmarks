import {
  storageGet,
  storageSet,
  sessionGet,
  sessionSet,
  settingsGet,
  setBadgeText,
  removeItem,
  moveItem,
  markOpened,
  toggleFavorite,
  renderItems,
} from "./lib.js";

let currentItems = [];
let session = { openedUrls: [], lastOpenedUrl: "" };
let settings = { confirmDelete: false };
let favoritesOnly = false;

const handlers = {
  onOpen: (url) => {
    session = markOpened(session, url);
    sessionSet(session);
    render();
  },
  onDelete: (url) => {
    if (settings.confirmDelete && !window.confirm("この記事を削除しますか？")) {
      return;
    }
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
    session,
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

document.getElementById("search").addEventListener("input", render);
document.getElementById("view-all-btn").addEventListener("click", () => {
  setView(false);
});
document.getElementById("view-fav-btn").addEventListener("click", () => {
  setView(true);
});
document
  .getElementById("menu-btn")
  .addEventListener("click", () => chrome.runtime.openOptionsPage());

async function init() {
  [currentItems, session, settings] = await Promise.all([
    storageGet(),
    sessionGet(),
    settingsGet(),
  ]);
  render();
}

init();
