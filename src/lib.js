export const STORAGE_KEY = "MiniBookMark_Items";
export const SESSION_KEY = "MiniBookMark_Session";
export const SETTINGS_KEY = "MiniBookMark_Settings";

export const PAGE_SIZE = 30;

const DEFAULT_SETTINGS = {
  confirmDelete: false,
  sortMode: "newest",
  pageSize: PAGE_SIZE,
};
const DEFAULT_SESSION = {
  openedUrls: [],
  lastOpenedUrl: "",
  siteUrl: "",
};

export async function storageGet() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

export function storageSet(items) {
  chrome.storage.local.set({ [STORAGE_KEY]: items });
}

export async function sessionGet() {
  const data = await chrome.storage.session.get(SESSION_KEY);
  return { ...DEFAULT_SESSION, ...data[SESSION_KEY] };
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

function faviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}`;
}

export function filterItems(items, keyword, siteUrl = "") {
  return items.filter((it) => {
    if (siteUrl && it.rootUrl !== siteUrl) return false;
    if (!keyword) return true;
    return (it.title || "").toLowerCase().includes(keyword.toLowerCase());
  });
}

// 同じ URL は古い項目を消して先頭に入れ直す
export function addItem(items, { url, title }) {
  const filtered = items.filter((it) => it.url !== url);
  const hostName = parseHost(url);
  return [
    { url, hostName, rootUrl: hostName, title, createdAt: Date.now() },
    ...filtered,
  ];
}

export function normalizeItems(items, now = Date.now()) {
  return items.map((it) => {
    if (it.createdAt && it.rootUrl !== undefined) return it;
    return {
      ...it,
      createdAt: it.createdAt || now,
      rootUrl: it.rootUrl ?? parseHost(it.url),
    };
  });
}

export function sortItems(items, mode) {
  const result = [...items];
  if (mode === "oldest") {
    result.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  } else {
    result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  return result;
}

export function removeItem(items, url) {
  return items.filter((it) => it.url !== url);
}

export function markOpened(session, url) {
  const openedUrls = session.openedUrls.includes(url)
    ? session.openedUrls
    : [...session.openedUrls, url];
  return { ...session, openedUrls, lastOpenedUrl: url };
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
    copy.rootUrl = copy.rootUrl || copy.hostName;
    copy.createdAt = copy.createdAt || Date.now();
    return copy;
  });
  const importedUrls = new Set(normalized.map((it) => it.url));
  return [
    ...normalized,
    ...existing.filter((it) => !importedUrls.has(it.url)),
  ];
}

export function renderItems(
  items,
  keyword,
  { onOpen, onDelete },
  session = DEFAULT_SESSION,
  siteUrl = "",
  limit = Infinity,
) {
  const list = document.getElementById("bookmark-list");
  list.innerHTML = "";

  const filtered = filterItems(items, keyword, siteUrl);
  filtered.slice(0, limit).forEach(
    ({ url, hostName, title }) => {
      const li = document.createElement("li");
      li.className = "bookmark-item";
      if (session.lastOpenedUrl === url) {
        li.classList.add("last-opened");
      }

      const readMark = document.createElement("span");
      readMark.className = "read-mark";
      readMark.textContent = session.openedUrls.includes(url) ? "✅" : "";

      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "bookmark-link";
      a.addEventListener("click", () => onOpen(url));

      const img = document.createElement("img");
      img.src = faviconUrl(hostName);
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
    },
  );

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "list-empty";
    empty.textContent =
      items.length === 0
        ? "保存された記事はまだありません"
        : "条件に一致する記事がありません";
    list.appendChild(empty);
  }

  const sentinel = document.getElementById("list-sentinel");
  if (sentinel) sentinel.hidden = filtered.length <= limit;

  document.getElementById("total-count").textContent =
    `Total: ${items.length}`;
}

function renderListView() {
  document.getElementById("list-view").innerHTML = `
    <input
      type="text"
      id="search"
      class="search-input"
      placeholder="記事タイトルを検索..."
    />
    <div class="sort-toggle" role="group" aria-label="並び順">
      <button type="button" id="sort-newest" class="sort-btn active">新しい順</button>
      <button type="button" id="sort-oldest" class="sort-btn">古い順</button>
    </div>
    <div class="site-filter">
      <div class="site-select-wrap">
        <button
          type="button"
          id="site-select-trigger"
          class="site-select-trigger"
          aria-haspopup="listbox"
          aria-expanded="false"
        >
          <img id="site-favicon" class="site-favicon" alt="" hidden />
          <span id="site-select-label" class="site-select-label">すべてのサイト</span>
          <span class="site-select-caret" aria-hidden="true">▾</span>
        </button>
        <div id="site-select-menu" class="site-select-menu" hidden>
          <input
            type="text"
            id="site-select-search"
            class="site-select-search"
            placeholder="サイトを検索..."
            autocomplete="off"
          />
          <ul
            id="site-select-list"
            class="site-select-list"
            role="listbox"
          ></ul>
        </div>
      </div>
    </div>
    <ul id="bookmark-list" class="bookmark-list"></ul>
    <div id="list-sentinel" class="list-sentinel" hidden></div>
  `;
}

// popup と フルタブ画面で共通の一覧の初期化。追加は popup だけが使う
export async function setupListView() {
  renderListView();
  let [currentItems, session, settings] = await Promise.all([
    storageGet(),
    sessionGet(),
    settingsGet(),
  ]);
  let sortMode = settings.sortMode === "oldest" ? "oldest" : "newest";
  let pageSize = settings.pageSize;
  let siteUrl = session.siteUrl;
  let siteSearch = "";
  let visibleCount = pageSize;

  const normalized = normalizeItems(currentItems);
  if (normalized.some((it, i) => it !== currentItems[i])) {
    currentItems = normalized;
    storageSet(currentItems);
  }

  function saveSiteFilter() {
    session = { ...session, siteUrl };
    sessionSet(session);
  }

  function updateSiteTrigger() {
    const favicon = document.getElementById("site-favicon");
    const label = document.getElementById("site-select-label");
    favicon.hidden = !siteUrl;
    if (siteUrl) {
      favicon.src = faviconUrl(siteUrl);
      label.textContent = siteUrl;
    } else {
      favicon.removeAttribute("src");
      label.textContent = "すべてのサイト";
    }
  }

  function renderSiteOptions() {
    const list = document.getElementById("site-select-list");
    const sites = [
      ...new Set(currentItems.map((it) => it.rootUrl).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, "ja"));

    if (siteUrl && !sites.includes(siteUrl)) {
      siteUrl = "";
      saveSiteFilter();
    }

    const needle = siteSearch.toLowerCase();
    const options = [{ value: "", label: "すべてのサイト" }]
      .concat(sites.map((site) => ({ value: site, label: site })))
      .filter(({ label }) => label.toLowerCase().includes(needle));

    list.innerHTML = "";
    if (options.length === 0) {
      const empty = document.createElement("li");
      empty.className = "site-empty";
      empty.textContent = "該当するサイトがありません";
      list.appendChild(empty);
      updateSiteTrigger();
      return;
    }

    options.forEach(({ value, label }) => {
      const option = document.createElement("li");
      option.className = "site-option";
      option.setAttribute("role", "option");
      option.dataset.value = value;
      option.setAttribute("aria-selected", String(value === siteUrl));

      const icon = document.createElement(value ? "img" : "span");
      icon.className = "site-option-favicon";
      if (value) {
        icon.src = faviconUrl(value);
        icon.alt = "";
      }
      option.appendChild(icon);

      const text = document.createElement("span");
      text.className = "site-option-label";
      text.textContent = label;
      option.appendChild(text);

      list.appendChild(option);
    });

    updateSiteTrigger();
  }

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
      renderSiteOptions();
      render();
    },
  };

  function render(reset = false) {
    if (reset) visibleCount = pageSize;
    renderItems(
      sortItems(currentItems, sortMode),
      document.getElementById("search").value,
      handlers,
      session,
      siteUrl,
      visibleCount,
    );
  }

  function updateSortButtons() {
    document
      .getElementById("sort-newest")
      .classList.toggle("active", sortMode === "newest");
    document
      .getElementById("sort-oldest")
      .classList.toggle("active", sortMode === "oldest");
  }

  function setSort(mode) {
    sortMode = mode;
    settings = { ...settings, sortMode };
    settingsSet(settings);
    updateSortButtons();
    render(true);
  }

  document
    .getElementById("search")
    .addEventListener("input", () => render(true));
  const siteTrigger = document.getElementById("site-select-trigger");
  const siteMenu = document.getElementById("site-select-menu");
  const siteSearchInput = document.getElementById("site-select-search");

  function setMenuOpen(open) {
    if (open) {
      siteSearch = "";
      siteSearchInput.value = "";
      renderSiteOptions();
    }
    siteMenu.hidden = !open;
    siteTrigger.setAttribute("aria-expanded", String(open));
  }

  siteSearchInput.addEventListener("input", (e) => {
    siteSearch = e.target.value;
    renderSiteOptions();
  });
  siteTrigger.addEventListener("click", () => setMenuOpen(siteMenu.hidden));
  siteMenu.addEventListener("click", (e) => {
    const option = e.target.closest(".site-option");
    if (!option) return;
    siteUrl = option.dataset.value;
    saveSiteFilter();
    renderSiteOptions();
    setMenuOpen(false);
    render(true);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".site-select-wrap")) setMenuOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenuOpen(false);
  });
  document
    .getElementById("sort-newest")
    .addEventListener("click", () => setSort("newest"));
  document
    .getElementById("sort-oldest")
    .addEventListener("click", () => setSort("oldest"));
  document
    .getElementById("menu-btn")
    .addEventListener("click", () => chrome.runtime.openOptionsPage());

  new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      visibleCount += pageSize;
      render();
    },
    { rootMargin: "200px" },
  ).observe(document.getElementById("list-sentinel"));

  updateSortButtons();
  renderSiteOptions();
  render();

  return {
    add: (item) => {
      currentItems = addItem(currentItems, item);
      storageSet(currentItems);
      setBadgeText(currentItems);
      renderSiteOptions();
      render();
    },
  };
}
