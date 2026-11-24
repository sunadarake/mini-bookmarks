import {
  storageGet,
  storageSet,
  setBadgeText,
  removeItem,
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
  currentItems = await storageGet();
  render();
}

init();
