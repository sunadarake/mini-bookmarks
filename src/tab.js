const STORAGE_KEY = "MiniBookMark_Items";

async function storageGet() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

function storageSet(items) {
  chrome.storage.local.set({ [STORAGE_KEY]: items });
}

function setBadgeText(items) {
  chrome.action.setBadgeText({ text: (items || []).length.toString() });
}

function parseHost(url) {
  const result = url.match(/^(https?:\/\/[^/]+)/);
  return result ? result[1] : "";
}

function markAsRead(url) {
  currentItems = currentItems.map((it) =>
    it.url === url ? { ...it, read: true } : it,
  );
  storageSet(currentItems);
  renderItems(currentItems, document.getElementById("search").value);
}

function renderItems(items, keyword) {
  const filtered = keyword
    ? items.filter((it) =>
        (it.title || "").toLowerCase().includes(keyword.toLowerCase()),
      )
    : items;

  const list = document.getElementById("bookmark-list");
  list.innerHTML = "";

  filtered.forEach(({ url, hostName, title, read }) => {
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
    a.addEventListener("click", () => markAsRead(url));

    const img = document.createElement("img");
    img.src = `https://www.google.com/s2/favicons?domain=${hostName}`;
    img.alt = "Favicon";
    img.className = "favicon";

    a.appendChild(img);
    a.append(` ${title || url}`);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "✕";
    deleteBtn.addEventListener("click", () => deleteURL(url));

    li.appendChild(readMark);
    li.appendChild(a);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

let currentItems = [];

async function init() {
  currentItems = await storageGet();
  document.getElementById("total-count").textContent =
    `Total: ${currentItems.length}`;
  renderItems(currentItems, "");
}

function deleteURL(url) {
  currentItems = currentItems.filter((it) => it.url !== url);
  storageSet(currentItems);
  setBadgeText(currentItems);
  document.getElementById("total-count").textContent =
    `Total: ${currentItems.length}`;
  renderItems(currentItems, document.getElementById("search").value);
}

document.getElementById("search").addEventListener("input", (e) => {
  renderItems(currentItems, e.target.value);
});

init();
