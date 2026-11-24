export const STORAGE_KEY = "MiniBookMark_Items";

export async function storageGet() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

export function storageSet(items) {
  chrome.storage.local.set({ [STORAGE_KEY]: items });
}

export function setBadgeText(items) {
  chrome.action.setBadgeText({ text: items.length.toString() });
}

export function parseHost(url) {
  const result = url.match(/^(https?:\/\/[^/]+)/);
  return result ? result[1] : "";
}

export function filterItems(items, keyword) {
  return keyword
    ? items.filter((it) =>
        (it.title || "").toLowerCase().includes(keyword.toLowerCase()),
      )
    : items;
}

// 同じ URL は古い項目を消して先頭に入れ直す（既読状態は未読に戻る）
export function addItem(items, { url, title }) {
  const filtered = items.filter((it) => it.url !== url);
  return [{ url, hostName: parseHost(url), title }, ...filtered];
}

export function removeItem(items, url) {
  return items.filter((it) => it.url !== url);
}

export function markRead(items, url) {
  return items.map((it) => (it.url === url ? { ...it, read: true } : it));
}

export function exportItems(items) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: items.map((item) => {
      const copy = { ...item };
      delete copy.read;
      return copy;
    }),
  };
}

// インポート項目を先頭に並べ、同一 URL はインポート側を優先する（既読は取り込まない）
export function mergeItems(existing, imported) {
  const normalized = imported.map((item) => {
    const copy = { ...item };
    delete copy.read;
    copy.hostName = copy.hostName || parseHost(copy.url);
    return copy;
  });
  const importedUrls = new Set(normalized.map((it) => it.url));
  return [
    ...normalized,
    ...existing.filter((it) => !importedUrls.has(it.url)),
  ];
}

export function renderItems(items, keyword, { onOpen, onDelete }) {
  const list = document.getElementById("bookmark-list");
  list.innerHTML = "";

  filterItems(items, keyword).forEach(({ url, hostName, title, read }) => {
    const li = document.createElement("li");
    li.className = "bookmark-item";

    const readMark = document.createElement("span");
    readMark.className = "read-mark";
    readMark.textContent = read ? "✅" : "";

    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "bookmark-link";
    a.addEventListener("click", () => onOpen(url));

    const img = document.createElement("img");
    img.src = `https://www.google.com/s2/favicons?domain=${hostName}`;
    img.alt = "Favicon";
    img.className = "favicon";

    a.appendChild(img);
    a.append(` ${title || url}`);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "✕";
    deleteBtn.addEventListener("click", () => onDelete(url));

    li.appendChild(readMark);
    li.appendChild(a);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });

  document.getElementById("total-count").textContent =
    `Total: ${items.length}`;
}
