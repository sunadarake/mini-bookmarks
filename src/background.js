import { storageGet, setBadgeText } from "./lib.js";

async function setBadge() {
  setBadgeText(await storageGet());
}

chrome.runtime.onStartup.addListener(() => {
  setBadge();
});

chrome.runtime.onInstalled.addListener(() => {
  setBadge();
});
