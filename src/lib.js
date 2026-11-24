export const STORAGE_KEY = "MiniBookMark_Items";
export const SESSION_KEY = "MiniBookMark_Session";
export const SETTINGS_KEY = "MiniBookMark_Settings";

export const DEFAULT_SETTINGS = { confirmDelete: false };
export const DEFAULT_SESSION = { openedUrls: [], lastOpenedUrl: "" };

export async function storageGet() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

export function storageSet(items) {
  chrome.storage.local.set({ [STORAGE_KEY]: items });
}

export async function sessionGet() {
  const data = await chrome.storage.session.get(SESSION_KEY);
  return data[SESSION_KEY] || DEFAULT_SESSION;
}

export function sessionSet(session) {
  chrome.storage.session.set({ [SESSION_KEY]: session });
}

export async function settingsGet() {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...data[SETTINGS_KEY] };
}

export function settingsSet(settings) {
  chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export function setBadgeText(items) {
  chrome.action.setBadgeText({ text: items.length.toString() });
}

export function parseHost(url) {
  const result = url.match(/^(https?:\/\/[^/]+)/);
  return result ? result[1] : "";
}

export function filterItems(items, keyword, favoritesOnly = false) {
  return items.filter((it) => {
    if (favoritesOnly && !it.favorite) return false;
    if (!keyword) return true;
    return (it.title || "").toLowerCase().includes(keyword.toLowerCase());
  });
}

// 同じ URL は古い項目を消して先頭に入れ直す
export function addItem(items, { url, title }) {
  const filtered = items.filter((it) => it.url !== url);
  return [{ url, hostName: parseHost(url), title }, ...filtered];
}

export function removeItem(items, url) {
  return items.filter((it) => it.url !== url);
}

export function moveItem(items, fromUrl, toUrl) {
  const fromIndex = items.findIndex((it) => it.url === fromUrl);
  const toIndex = items.findIndex((it) => it.url === toUrl);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return [...items];
  }
  const result = [...items];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

export function markOpened(session, url) {
  const openedUrls = session.openedUrls.includes(url)
    ? session.openedUrls
    : [...session.openedUrls, url];
  return { openedUrls, lastOpenedUrl: url };
}

export function toggleFavorite(items, url) {
  return items.map((it) =>
    it.url === url ? { ...it, favorite: !it.favorite } : it,
  );
}

function omitRead(item) {
  const copy = { ...item };
  delete copy.read;
  return copy;
}

export function exportItems(items) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: items.map(omitRead),
  };
}

// インポート項目を先頭に並べ、同一 URL はインポート側を優先する（既読は取り込まない）
export function mergeItems(existing, imported) {
  const normalized = imported.map((item) => {
    const copy = omitRead(item);
    copy.hostName = copy.hostName || parseHost(copy.url);
    return copy;
  });
  const importedUrls = new Set(normalized.map((it) => it.url));
  return [
    ...normalized,
    ...existing.filter((it) => !importedUrls.has(it.url)),
  ];
}

// ドラッグ中の URL と、ドラッグ直後かどうかは drag に持たせてリンクのクリックと共有する
function enableDrag(li, url, list, onReorder, drag) {
  li.draggable = true;
  li.addEventListener("dragstart", (e) => {
    drag.url = url;
    drag.recently = true;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", url);
    li.classList.add("dragging");
  });
  li.addEventListener("dragover", (e) => {
    if (drag.url === null || drag.url === url) return;
    e.preventDefault();
    li.classList.add("drag-over");
  });
  li.addEventListener("dragleave", () => {
    li.classList.remove("drag-over");
  });
  li.addEventListener("drop", (e) => {
    e.preventDefault();
    li.classList.remove("drag-over");
    if (drag.url !== null && drag.url !== url) {
      onReorder(drag.url, url);
    }
    drag.url = null;
  });
  li.addEventListener("dragend", () => {
    li.classList.remove("dragging");
    drag.url = null;
    list
      .querySelectorAll(".drag-over")
      .forEach((el) => el.classList.remove("drag-over"));
    setTimeout(() => {
      drag.recently = false;
    }, 0);
  });
}

export function renderItems(
  items,
  keyword,
  { onOpen, onDelete, onToggleFavorite, onReorder },
  favoritesOnly = false,
  session = DEFAULT_SESSION,
) {
  const list = document.getElementById("bookmark-list");
  list.innerHTML = "";

  const canReorder = !keyword && !favoritesOnly;
  const drag = { url: null, recently: false };

  filterItems(items, keyword, favoritesOnly).forEach(
    ({ url, hostName, title, favorite }) => {
      const li = document.createElement("li");
      li.className = "bookmark-item";
      if (session.lastOpenedUrl === url) {
        li.classList.add("last-opened");
      }

      if (canReorder) {
        enableDrag(li, url, list, onReorder, drag);
      }

      const readMark = document.createElement("span");
      readMark.className = "read-mark";
      readMark.textContent = session.openedUrls.includes(url) ? "✅" : "";

      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "bookmark-link";
      a.addEventListener("click", (e) => {
        // ドラッグ直後のクリックで既読・新規タブが走るのを防ぐ
        if (drag.recently) {
          e.preventDefault();
          drag.recently = false;
          return;
        }
        onOpen(url);
      });

      const img = document.createElement("img");
      img.src = `https://www.google.com/s2/favicons?domain=${hostName}`;
      img.alt = "Favicon";
      img.className = "favicon";

      a.appendChild(img);
      a.append(` ${title || url}`);

      const starBtn = document.createElement("button");
      starBtn.className = favorite ? "star-btn active" : "star-btn";
      starBtn.textContent = favorite ? "★" : "☆";
      starBtn.addEventListener("click", () => onToggleFavorite(url));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "✕";
      deleteBtn.addEventListener("click", () => onDelete(url));

      li.appendChild(readMark);
      li.appendChild(a);
      li.appendChild(starBtn);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    },
  );

  document.getElementById("total-count").textContent =
    `Total: ${items.length}`;
}

// popup と フルタブ画面で共通の一覧の初期化。追加は popup だけが使う
export async function setupListView() {
  let [currentItems, session, settings] = await Promise.all([
    storageGet(),
    sessionGet(),
    settingsGet(),
  ]);
  let favoritesOnly = false;

  const handlers = {
    onOpen: (url) => {
      session = markOpened(session, url);
      sessionSet(session);
      render();
    },
    onDelete: (url) => {
      if (
        settings.confirmDelete &&
        !window.confirm("この記事を削除しますか？")
      ) {
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

  render();

  return {
    add: (item) => {
      currentItems = addItem(currentItems, item);
      storageSet(currentItems);
      setBadgeText(currentItems);
      render();
    },
  };
}
