// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  STORAGE_KEY,
  addItem,
  filterItems,
  markRead,
  parseHost,
  removeItem,
  renderItems,
  setBadgeText,
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
});

describe("addItem", () => {
  it("新しい項目を先頭に追加し hostName を付ける", () => {
    const items = [{ url: "https://a.com/1", hostName: "https://a.com" }];
    const result = addItem(items, { url: "https://b.com/2", title: "B" });
    expect(result).toEqual([
      { url: "https://b.com/2", hostName: "https://b.com", title: "B" },
      items[0],
    ]);
  });

  it("同じ URL は入れ替えて先頭に置き、既読は未読に戻る", () => {
    const items = [
      { url: "https://a.com/1", title: "A", read: true },
      { url: "https://b.com/2", title: "B" },
    ];
    const result = addItem(items, { url: "https://a.com/1", title: "A2" });
    expect(result).toEqual([
      { url: "https://a.com/1", hostName: "https://a.com", title: "A2" },
      items[1],
    ]);
  });

  it("元の配列を変更しない", () => {
    const items = [{ url: "https://a.com/1" }];
    addItem(items, { url: "https://b.com/2", title: "B" });
    expect(items).toHaveLength(1);
  });
});

describe("removeItem / markRead", () => {
  const items = [{ url: "a" }, { url: "b" }];

  it("removeItem は対象の URL だけ除く", () => {
    expect(removeItem(items, "a")).toEqual([{ url: "b" }]);
  });

  it("removeItem は存在しない URL なら変化しない", () => {
    expect(removeItem(items, "x")).toEqual(items);
  });

  it("markRead は対象だけ read: true にする", () => {
    expect(markRead(items, "b")).toEqual([{ url: "a" }, { url: "b", read: true }]);
  });

  it("markRead は存在しない URL なら変化しない", () => {
    expect(markRead(items, "x")).toEqual(items);
  });
});

describe("chrome API を使う関数", () => {
  const local = { get: vi.fn(), set: vi.fn() };
  const action = { setBadgeText: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("chrome", { storage: { local }, action });
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
});

describe("renderItems", () => {
  const handlers = { onOpen: vi.fn(), onDelete: vi.fn() };

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

  it("既読マークを表示し、title が無ければ URL を表示する", () => {
    const items = [{ url: "https://a.com/", hostName: "https://a.com", read: true }];
    renderItems(items, "", handlers);
    expect(document.querySelector(".read-mark").textContent).toBe("✅");
    expect(document.querySelector(".bookmark-link").textContent).toContain(
      "https://a.com/",
    );
  });

  it("リンクと削除ボタンでコールバックを呼ぶ", () => {
    const items = [{ url: "https://a.com/", hostName: "https://a.com", title: "A" }];
    renderItems(items, "", handlers);
    document.querySelector(".bookmark-link").click();
    document.querySelector(".delete-btn").click();
    expect(handlers.onOpen).toHaveBeenCalledWith("https://a.com/");
    expect(handlers.onDelete).toHaveBeenCalledWith("https://a.com/");
  });
});
