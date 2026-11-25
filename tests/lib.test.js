// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PAGE_SIZE,
  SESSION_KEY,
  SETTINGS_KEY,
  STORAGE_KEY,
  addItem,
  exportItems,
  filterItems,
  markOpened,
  mergeItems,
  normalizeItems,
  sortItems,
  parseHost,
  removeItem,
  renderItems,
  sessionGet,
  sessionSet,
  setBadgeText,
  settingsGet,
  settingsSet,
  setupListView,
  storageGet,
  storageSet,
} from "../src/lib.js";

describe("parseHost", () => {
  it("http と https のホスト部分を返す", () => {
    expect(parseHost("http://example.com/a")).toBe("http://example.com");
    expect(parseHost("https://example.com/a?b=1#c")).toBe(
      "https://example.com",
    );
  });

  it("ポート付きでもホスト部分を返す", () => {
    expect(parseHost("http://localhost:3000/x")).toBe("http://localhost:3000");
  });

  it("http(s) 以外は空文字を返す", () => {
    expect(parseHost("chrome://extensions")).toBe("");
  });
});

describe("filterItems", () => {
  const items = [
    { url: "a", title: "Hello World" },
    { url: "b", title: "foo" },
    { url: "c" },
  ];

  it("キーワードが空なら全件を返す", () => {
    expect(filterItems(items, "")).toEqual(items);
  });

  it("大文字小文字を区別せず部分一致で絞り込む", () => {
    expect(filterItems(items, "WORLD")).toEqual([items[0]]);
  });

  it("title が無い項目は一致しない", () => {
    expect(filterItems(items, "undefined")).toEqual([]);
  });

  describe("サイト条件", () => {
    const sites = [
      { url: "https://a.com/1", rootUrl: "https://a.com", title: "apple" },
      { url: "https://a.com/2", rootUrl: "https://a.com", title: "banana" },
      { url: "https://b.com/1", rootUrl: "https://b.com", title: "apple" },
      { url: "chrome://extensions", rootUrl: "", title: "settings" },
    ];

    it("siteUrl は rootUrl の完全一致で絞り込む", () => {
      expect(
        filterItems(sites, "", "https://b.com").map((it) => it.url),
      ).toEqual(["https://b.com/1"]);
    });

    it("siteUrl は部分一致では一致しない", () => {
      expect(filterItems(sites, "", "a.com")).toEqual([]);
    });

    it("タイトル検索とは AND で絞り込む", () => {
      expect(
        filterItems(sites, "apple", "https://a.com").map((it) => it.url),
      ).toEqual(["https://a.com/1"]);
    });

    it("rootUrl が無い項目はサイト条件で除外され、条件なしでは含まれる", () => {
      const missing = [{ url: "chrome://extensions", title: "x" }];
      expect(filterItems(missing, "", "https://a.com")).toEqual([]);
      expect(filterItems(missing, "")).toEqual(missing);
    });
  });
});

describe("addItem", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("新しい項目を先頭に追加し hostName・rootUrl・createdAt を付ける", () => {
    const items = [{ url: "https://a.com/1", hostName: "https://a.com" }];
    const result = addItem(items, { url: "https://b.com/2", title: "B" });
    expect(result).toEqual([
      {
        url: "https://b.com/2",
        hostName: "https://b.com",
        rootUrl: "https://b.com",
        title: "B",
        createdAt: 1000,
      },
      items[0],
    ]);
  });

  it("同じ URL は入れ替えて先頭に置き、read は引き継がない", () => {
    const items = [
      { url: "https://a.com/1", title: "A", read: true },
      { url: "https://b.com/2", title: "B" },
    ];
    const result = addItem(items, { url: "https://a.com/1", title: "A2" });
    expect(result).toEqual([
      {
        url: "https://a.com/1",
        hostName: "https://a.com",
        rootUrl: "https://a.com",
        title: "A2",
        createdAt: 1000,
      },
      items[1],
    ]);
  });

  it("元の配列を変更しない", () => {
    const items = [{ url: "https://a.com/1" }];
    addItem(items, { url: "https://b.com/2", title: "B" });
    expect(items).toHaveLength(1);
  });
});

describe("normalizeItems", () => {
  it("createdAt と rootUrl が無い項目を補完する", () => {
    const items = [
      { url: "https://a.com/1", createdAt: 500, rootUrl: "https://a.com" },
      { url: "https://b.com/2" },
    ];
    expect(normalizeItems(items, 1000)).toEqual([
      { url: "https://a.com/1", createdAt: 500, rootUrl: "https://a.com" },
      { url: "https://b.com/2", createdAt: 1000, rootUrl: "https://b.com" },
    ]);
  });

  it("createdAt があっても rootUrl が無ければ補完する", () => {
    const items = [{ url: "https://a.com/1", createdAt: 500 }];
    expect(normalizeItems(items, 1000)).toEqual([
      { url: "https://a.com/1", createdAt: 500, rootUrl: "https://a.com" },
    ]);
  });

  it("補完が不要な項目は同じオブジェクトを返し、元配列は変更しない", () => {
    const item = {
      url: "https://a.com/",
      createdAt: 500,
      rootUrl: "https://a.com",
    };
    const items = [item];
    expect(normalizeItems(items, 1000)[0]).toBe(item);
    expect(items[0]).toEqual(item);
  });

  it("http(s) 以外は rootUrl を空文字で補完する", () => {
    expect(normalizeItems([{ url: "chrome://extensions" }], 1000)).toEqual([
      { url: "chrome://extensions", createdAt: 1000, rootUrl: "" },
    ]);
  });
});

describe("sortItems", () => {
  const items = [
    { url: "https://b.com/", hostName: "https://b.com", title: "banana", createdAt: 200 },
    { url: "https://a.com/", hostName: "https://a.com", title: "apple", createdAt: 100 },
    { url: "https://c.com/", hostName: "https://c.com", title: "cherry", createdAt: 300 },
  ];

  it("newest は createdAt の降順", () => {
    expect(sortItems(items, "newest").map((it) => it.url)).toEqual([
      "https://c.com/",
      "https://b.com/",
      "https://a.com/",
    ]);
  });

  it("oldest は createdAt の昇順", () => {
    expect(sortItems(items, "oldest").map((it) => it.url)).toEqual([
      "https://a.com/",
      "https://b.com/",
      "https://c.com/",
    ]);
  });

  it("newest / oldest 以外は新しい順として扱う", () => {
    expect(sortItems(items, "unknown").map((it) => it.url)).toEqual([
      "https://c.com/",
      "https://b.com/",
      "https://a.com/",
    ]);
  });

  it("元の配列を変更しない", () => {
    sortItems(items, "newest");
    expect(items.map((it) => it.url)).toEqual([
      "https://b.com/",
      "https://a.com/",
      "https://c.com/",
    ]);
  });
});

describe("removeItem / markOpened", () => {
  const items = [{ url: "a" }, { url: "b" }];

  it("removeItem は対象の URL だけ除く", () => {
    expect(removeItem(items, "a")).toEqual([{ url: "b" }]);
  });

  it("removeItem は存在しない URL なら変化しない", () => {
    expect(removeItem(items, "x")).toEqual(items);
  });

  it("markOpened は URL を追加し、直前の URL を更新する", () => {
    const session = { openedUrls: ["a"], lastOpenedUrl: "a" };
    expect(markOpened(session, "b")).toEqual({
      openedUrls: ["a", "b"],
      lastOpenedUrl: "b",
    });
  });

  it("markOpened は開いたことのある URL を重複追加しない", () => {
    const session = { openedUrls: ["a", "b"], lastOpenedUrl: "a" };
    expect(markOpened(session, "b")).toEqual({
      openedUrls: ["a", "b"],
      lastOpenedUrl: "b",
    });
  });

  it("markOpened は元のセッションを変更しない", () => {
    const session = { openedUrls: ["a"], lastOpenedUrl: "a" };
    markOpened(session, "b");
    expect(session).toEqual({ openedUrls: ["a"], lastOpenedUrl: "a" });
  });

  it("markOpened はサイト絞り込みの状態を保持する", () => {
    const session = {
      openedUrls: [],
      lastOpenedUrl: "",
      siteUrl: "https://example.com",
    };
    expect(markOpened(session, "https://example.com/1")).toEqual({
      openedUrls: ["https://example.com/1"],
      lastOpenedUrl: "https://example.com/1",
      siteUrl: "https://example.com",
    });
  });
});

describe("chrome API を使う関数", () => {
  const local = { get: vi.fn(), set: vi.fn() };
  const session = { get: vi.fn(), set: vi.fn() };
  const action = { setBadgeText: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("chrome", { storage: { local, session }, action });
  });

  it("storageGet は未保存なら空配列を返す", async () => {
    local.get.mockResolvedValue({});
    expect(await storageGet()).toEqual([]);
    expect(local.get).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("storageGet は保存済みの配列を返す", async () => {
    local.get.mockResolvedValue({ [STORAGE_KEY]: [{ url: "a" }] });
    expect(await storageGet()).toEqual([{ url: "a" }]);
  });

  it("storageSet は STORAGE_KEY で保存する", () => {
    storageSet([{ url: "a" }]);
    expect(local.set).toHaveBeenCalledWith({ [STORAGE_KEY]: [{ url: "a" }] });
  });

  it("setBadgeText は件数を文字列で渡す", () => {
    setBadgeText([{}, {}, {}]);
    expect(action.setBadgeText).toHaveBeenCalledWith({ text: "3" });
  });

  it("sessionGet は未保存なら初期状態を返す", async () => {
    session.get.mockResolvedValue({});
    expect(await sessionGet()).toEqual({
      openedUrls: [],
      lastOpenedUrl: "",
      siteUrl: "",
    });
    expect(session.get).toHaveBeenCalledWith(SESSION_KEY);
  });

  it("sessionGet は保存値にサイト絞り込みの既定値をマージして返す", async () => {
    const saved = { openedUrls: ["a"], lastOpenedUrl: "a" };
    session.get.mockResolvedValue({ [SESSION_KEY]: saved });
    expect(await sessionGet()).toEqual({
      openedUrls: ["a"],
      lastOpenedUrl: "a",
      siteUrl: "",
    });
  });

  it("sessionGet は保存済みのサイト絞り込みを返す", async () => {
    const saved = {
      openedUrls: [],
      lastOpenedUrl: "",
      siteUrl: "https://example.com",
    };
    session.get.mockResolvedValue({ [SESSION_KEY]: saved });
    expect(await sessionGet()).toEqual(saved);
  });

  it("sessionSet は SESSION_KEY で保存する", () => {
    const saved = { openedUrls: ["a"], lastOpenedUrl: "a" };
    sessionSet(saved);
    expect(session.set).toHaveBeenCalledWith({ [SESSION_KEY]: saved });
  });

  it("settingsGet は未保存なら既定値を返す", async () => {
    local.get.mockResolvedValue({});
    expect(await settingsGet()).toEqual({
      confirmDelete: false,
      sortMode: "newest",
    });
    expect(local.get).toHaveBeenCalledWith(SETTINGS_KEY);
  });

  it("settingsGet は保存値を既定値にマージして返す", async () => {
    local.get.mockResolvedValue({
      [SETTINGS_KEY]: { confirmDelete: true },
    });
    expect(await settingsGet()).toEqual({
      confirmDelete: true,
      sortMode: "newest",
    });
  });

  it("settingsSet は SETTINGS_KEY で保存する", () => {
    settingsSet({ confirmDelete: true });
    expect(local.set).toHaveBeenCalledWith({
      [SETTINGS_KEY]: { confirmDelete: true },
    });
  });
});

describe("renderItems", () => {
  const handlers = {
    onOpen: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML =
      '<span id="total-count"></span><ul id="bookmark-list"></ul>';
  });

  it("絞り込み後の項目を描画し、件数は全件を表示する", () => {
    const items = [
      { url: "https://a.com/", hostName: "https://a.com", title: "apple" },
      { url: "https://b.com/", hostName: "https://b.com", title: "banana" },
    ];
    renderItems(items, "app", handlers);
    expect(document.querySelectorAll(".bookmark-item")).toHaveLength(1);
    expect(document.getElementById("total-count").textContent).toBe("Total: 2");
  });

  it("記事が 1 件も無ければ空状態を表示する", () => {
    renderItems([], "", handlers);
    expect(document.querySelectorAll(".bookmark-item")).toHaveLength(0);
    expect(document.querySelector(".list-empty").textContent).toBe(
      "保存された記事はまだありません",
    );
  });

  it("絞り込み結果が 0 件なら該当なしの空状態を表示する", () => {
    const items = [
      { url: "https://a.com/", hostName: "https://a.com", title: "apple" },
    ];
    renderItems(items, "banana", handlers);
    expect(document.querySelectorAll(".bookmark-item")).toHaveLength(0);
    expect(document.querySelector(".list-empty").textContent).toBe(
      "条件に一致する記事がありません",
    );
    expect(document.getElementById("total-count").textContent).toBe("Total: 1");
  });

  it("開いた項目にチェックを表示し、title が無ければ URL を表示する", () => {
    const items = [{ url: "https://a.com/", hostName: "https://a.com" }];
    renderItems(items, "", handlers, {
      openedUrls: ["https://a.com/"],
      lastOpenedUrl: "",
    });
    expect(document.querySelector(".read-mark").textContent).toBe("✅");
    expect(document.querySelector(".bookmark-link").textContent).toContain(
      "https://a.com/",
    );
  });

  it("直前に開いた項目に last-opened を付け、開いていない項目にはチェックを付けない", () => {
    const items = [
      { url: "https://a.com/", hostName: "https://a.com" },
      { url: "https://b.com/", hostName: "https://b.com" },
    ];
    renderItems(items, "", handlers, {
      openedUrls: ["https://a.com/", "https://b.com/"],
      lastOpenedUrl: "https://b.com/",
    });
    const rows = document.querySelectorAll(".bookmark-item");
    expect(rows[0].classList.contains("last-opened")).toBe(false);
    expect(rows[0].querySelector(".read-mark").textContent).toBe("✅");
    expect(rows[1].classList.contains("last-opened")).toBe(true);
    expect(rows[1].querySelector(".read-mark").textContent).toBe("✅");
  });

  it("リンクと削除ボタンでコールバックを呼ぶ", () => {
    const items = [{ url: "https://a.com/", hostName: "https://a.com", title: "A" }];
    renderItems(items, "", handlers);
    document.querySelector(".bookmark-link").click();
    document.querySelector(".delete-btn").click();
    expect(handlers.onOpen).toHaveBeenCalledWith("https://a.com/");
    expect(handlers.onDelete).toHaveBeenCalledWith("https://a.com/");
  });

  it("limit 件だけ描画し、残りがあればセンチネルを表示する", () => {
    document.body.innerHTML =
      '<span id="total-count"></span><ul id="bookmark-list"></ul><div id="list-sentinel" hidden></div>';
    const items = [
      { url: "https://a.com/", hostName: "https://a.com" },
      { url: "https://b.com/", hostName: "https://b.com" },
      { url: "https://c.com/", hostName: "https://c.com" },
    ];
    renderItems(items, "", handlers, undefined, "", 2);
    expect(document.querySelectorAll(".bookmark-item")).toHaveLength(2);
    expect(document.getElementById("total-count").textContent).toBe("Total: 3");
    expect(document.getElementById("list-sentinel").hidden).toBe(false);
  });

  it("limit が総数以上ならセンチネルを隠す", () => {
    document.body.innerHTML =
      '<span id="total-count"></span><ul id="bookmark-list"></ul><div id="list-sentinel" hidden></div>';
    const items = [{ url: "https://a.com/", hostName: "https://a.com" }];
    renderItems(items, "", handlers, undefined, "", 1);
    expect(document.getElementById("list-sentinel").hidden).toBe(true);
  });
});

describe("setupListView のページング", () => {
  let observerCallback;
  let observed;

  beforeEach(() => {
    document.body.innerHTML = `
      <span id="total-count"></span>
      <button id="menu-btn"></button>
      <div id="list-view"></div>
    `;

    const items = Array.from({ length: 250 }, (_, i) => ({
      url: `https://example.com/${i}`,
      hostName: "https://example.com",
      rootUrl: "https://example.com",
      title: `article ${i}`,
      createdAt: i,
    }));
    const local = {
      get: vi.fn((key) =>
        Promise.resolve(key === STORAGE_KEY ? { [STORAGE_KEY]: items } : {}),
      ),
      set: vi.fn(),
    };
    const session = { get: vi.fn().mockResolvedValue({}), set: vi.fn() };
    vi.stubGlobal("chrome", {
      storage: { local, session },
      action: { setBadgeText: vi.fn() },
      runtime: { openOptionsPage: vi.fn() },
    });

    class MockIntersectionObserver {
      constructor(callback) {
        observerCallback = callback;
      }
      observe(element) {
        observed = element;
      }
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("最初は 100 件を描画し、スクロールで 100 件ずつ追加する", async () => {
    await setupListView();
    expect(observed).toBe(document.getElementById("list-sentinel"));
    expect(document.querySelectorAll(".bookmark-item")).toHaveLength(
      PAGE_SIZE,
    );
    expect(document.getElementById("total-count").textContent).toBe("Total: 250");
    expect(document.getElementById("list-sentinel").hidden).toBe(false);

    observerCallback([{ isIntersecting: true }]);
    expect(document.querySelectorAll(".bookmark-item")).toHaveLength(
      PAGE_SIZE * 2,
    );

    observerCallback([{ isIntersecting: true }]);
    expect(document.querySelectorAll(".bookmark-item")).toHaveLength(250);
    expect(document.getElementById("list-sentinel").hidden).toBe(true);
  });

  it("検索を変えると最初の 100 件に戻す", async () => {
    await setupListView();
    observerCallback([{ isIntersecting: true }]);
    expect(document.querySelectorAll(".bookmark-item")).toHaveLength(
      PAGE_SIZE * 2,
    );

    const search = document.getElementById("search");
    search.value = "article";
    search.dispatchEvent(new Event("input"));
    expect(document.querySelectorAll(".bookmark-item")).toHaveLength(
      PAGE_SIZE,
    );
  });

  it("交差していない通知では追加読み込みしない", async () => {
    await setupListView();
    observerCallback([{ isIntersecting: false }]);
    expect(document.querySelectorAll(".bookmark-item")).toHaveLength(
      PAGE_SIZE,
    );
  });
});

describe("exportItems", () => {
  it("read を除外し、その他の状態は保持する", () => {
    const items = [
      {
        url: "https://a.com/",
        hostName: "https://a.com",
        title: "A",
        read: true,
      },
      { url: "https://b.com/", hostName: "https://b.com", title: "B" },
    ];
    const result = exportItems(items);
    expect(result.version).toBe(1);
    expect(typeof result.exportedAt).toBe("string");
    expect(result.items).toEqual([
      {
        url: "https://a.com/",
        hostName: "https://a.com",
        title: "A",
      },
      { url: "https://b.com/", hostName: "https://b.com", title: "B" },
    ]);
  });

  it("元の配列を変更しない", () => {
    const items = [{ url: "https://a.com/", read: true }];
    exportItems(items);
    expect(items[0].read).toBe(true);
  });

  it("createdAt を保持する", () => {
    const items = [{ url: "https://a.com/", createdAt: 500 }];
    expect(exportItems(items).items[0].createdAt).toBe(500);
  });

  it("rootUrl を保持する", () => {
    const items = [
      { url: "https://a.com/", hostName: "https://a.com", rootUrl: "https://a.com" },
    ];
    expect(exportItems(items).items[0].rootUrl).toBe("https://a.com");
  });
});

describe("mergeItems", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(2000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("インポート項目を先頭に、インポート順を維持して並べる", () => {
    const existing = [
      { url: "https://a.com/", title: "A" },
      { url: "https://b.com/", title: "B" },
    ];
    const imported = [
      { url: "https://c.com/", title: "C" },
      { url: "https://d.com/", title: "D" },
    ];
    const result = mergeItems(existing, imported);
    expect(result.map((it) => it.url)).toEqual([
      "https://c.com/",
      "https://d.com/",
      "https://a.com/",
      "https://b.com/",
    ]);
  });

  it("同一 URL はインポート側を優先し、重複させない", () => {
    const existing = [
      { url: "https://a.com/", title: "old", read: true },
      { url: "https://b.com/", title: "B" },
    ];
    const imported = [{ url: "https://a.com/", title: "new" }];
    const result = mergeItems(existing, imported);
    expect(result).toEqual([
      {
        url: "https://a.com/",
        hostName: "https://a.com",
        rootUrl: "https://a.com",
        title: "new",
        createdAt: 2000,
      },
      { url: "https://b.com/", title: "B" },
    ]);
  });

  it("read は取り込まず、その他の状態は保持する", () => {
    const imported = [{ url: "https://a.com/", title: "A", read: true }];
    const result = mergeItems([], imported);
    expect(result[0].read).toBeUndefined();
    expect(result[0].title).toBe("A");
  });

  it("createdAt が無いインポート項目に現在時刻を補完し、既存値は保持する", () => {
    const imported = [
      { url: "https://a.com/" },
      { url: "https://b.com/", createdAt: 500 },
    ];
    const result = mergeItems([], imported);
    expect(result[0].createdAt).toBe(2000);
    expect(result[1].createdAt).toBe(500);
  });

  it("rootUrl が無いインポート項目に hostName か URL から補完する", () => {
    const imported = [
      { url: "https://a.com/" },
      { url: "https://b.com/", hostName: "https://b.com" },
      { url: "https://c.com/", rootUrl: "https://c.com" },
    ];
    const result = mergeItems([], imported);
    expect(result[0].rootUrl).toBe("https://a.com");
    expect(result[1].rootUrl).toBe("https://b.com");
    expect(result[2].rootUrl).toBe("https://c.com");
  });
});
