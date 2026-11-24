import {
  storageGet,
  storageSet,
  settingsGet,
  settingsSet,
  setBadgeText,
  exportItems,
  mergeItems,
} from "./lib.js";

const message = document.getElementById("message");
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const preview = document.getElementById("preview");
const saveBtn = document.getElementById("save-btn");
const confirmDelete = document.getElementById("confirm-delete");
const version = document.getElementById("version");

let pendingItems = [];

function showMessage(text, type) {
  message.textContent = text;
  message.className = `alert alert-${type}`;
}

function clearMessage() {
  message.textContent = "";
  message.className = "alert hidden";
}

function resetPreview() {
  pendingItems = [];
  preview.textContent = "";
  saveBtn.disabled = true;
}

async function exportData() {
  clearMessage();
  const items = await storageGet();
  const blob = new Blob([JSON.stringify(exportItems(items), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mini-bookmarks.json";
  a.click();
  URL.revokeObjectURL(url);
}

function readImport(text) {
  clearMessage();
  resetPreview();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    showMessage("JSON の読み込みに失敗しました", "danger");
    return;
  }

  if (
    !data ||
    !Array.isArray(data.items) ||
    !data.items.every((it) => it && typeof it.url === "string")
  ) {
    showMessage("想定外の形式です", "danger");
    return;
  }

  pendingItems = data.items;
  preview.textContent = `${pendingItems.length}件を保存します`;
  saveBtn.disabled = false;
}

async function readFile(file) {
  if (!file) return;
  readImport(await file.text());
}

async function save() {
  clearMessage();
  const existing = await storageGet();
  const merged = mergeItems(existing, pendingItems);
  storageSet(merged);
  setBadgeText(merged);
  showMessage(`${pendingItems.length}件を保存しました`, "success");
  resetPreview();
}

document.getElementById("export-btn").addEventListener("click", exportData);
saveBtn.addEventListener("click", save);
fileInput.addEventListener("change", () => readFile(fileInput.files[0]));
confirmDelete.addEventListener("change", () => {
  settingsSet({ confirmDelete: confirmDelete.checked });
});

async function initSettings() {
  const settings = await settingsGet();
  confirmDelete.checked = settings.confirmDelete;
}

initSettings();
version.textContent = `バージョン ${chrome.runtime.getManifest().version}`;

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});
dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragover");
  readFile(event.dataTransfer.files[0]);
});
