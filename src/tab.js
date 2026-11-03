import {
  storageGet,
  storageSet,
  setBadgeText,
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

document.getElementById("search").addEventListener("input", render);

async function init() {
  currentItems = await storageGet();
  render();
}

init();
