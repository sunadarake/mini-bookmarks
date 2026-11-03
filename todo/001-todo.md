# テストしやすい構成への整理とユニットテスト導入

## 概要
`popup.js` と `tab.js` に同じ関数が重複し、`chrome.*` API と処理が混ざっていて自動テストできない。
共通処理を `src/lib.js` に切り出し、純粋なロジックを Vitest でテストできるようにする。挙動は変えない。

## 調査結果
- `src/popup.js` と `src/tab.js` は `storageGet` / `storageSet` / `setBadgeText` / `parseHost` / `markAsRead` / `renderItems` / `deleteURL` / `init` がほぼ同一。`popup.js` だけが `addURL` と、フルタブを開くボタンを持つ
- `STORAGE_KEY`（`"MiniBookMark_Items"`）は `background.js`・`popup.js`・`tab.js` で重複定義されている
- `markAsRead` / `deleteURL` / `addURL` は、配列の変換、`chrome.storage` への保存、バッジ更新、再描画が1つの関数に混在している
- `src/popup.html` / `src/tab.html` は通常の `<script src>` で読み込んでいる。`manifest.json` の background は `type: module` なし
- `package.json`・テスト・lint は無い（`AGENTS.md` にも未導入と記載済み）
- `todo/` は空

## 実装計画
- [x] ステップ1: `package.json` を作り、Vitest を devDependencies に追加する。`test` スクリプトを定義する。`.gitignore` は `/node_modules` を除外済みなので変更不要
- [x] ステップ2: `src/lib.js` を新規作成し、`STORAGE_KEY`・`storageGet`・`storageSet`・`setBadgeText`・`parseHost` を移す（`popup.js` / `tab.js` の重複を削除して import に置き換える）
- [x] ステップ3: 配列の変換を純粋関数として `src/lib.js` に切り出す: `filterItems(items, keyword)`、`addItem(items, { url, title })`（重複 URL は古い項目を消して先頭に追加、`hostName` は `parseHost` で付与）、`removeItem(items, url)`、`markRead(items, url)`
- [x] ステップ4: `renderItems` と、合計件数の表示更新を `src/lib.js` に移し、`markAsRead` / `deleteURL` のコールバックを引数で受け取る形にする。`popup.js` / `tab.js` は、ステップ3の関数と保存・バッジ更新・再描画を呼ぶだけにする
- [x] ステップ5: `popup.html` / `tab.html` の script を `type="module"` に変更する。`manifest.json` の background に `"type": "module"` を追加し、`background.js` も `lib.js` から `STORAGE_KEY` / `storageGet` を import する
- [x] ステップ6: `AGENTS.md` を更新する（技術スタックの言語を「ES2020」に、コマンド欄のテスト、ディレクトリ構成の `lib.js`、「重複している」旨の注意書きの削除）

## テスト・確認方法
- [x] `tests/lib.test.js` を作成し、純粋関数を検証する
  - `parseHost`: http / https、パスやクエリ付き、`chrome://` など http(s) 以外は空文字
  - `filterItems`: 空キーワード、大文字小文字の区別なし、`title` が無い項目
  - `addItem`: 新規は先頭、重複 URL は入れ替えて先頭、既読状態の扱い
  - `removeItem` / `markRead`: 対象のみ変更される、存在しない URL は変化なし
- [x] `chrome.storage.local` を `vi.stubGlobal` でモックし、`storageGet`（未保存時は空配列）と `storageSet` を検証する
- [x] （任意）jsdom で `renderItems` の出力（既読マーク、`title` なしのとき URL を表示）を検証する
- [x] `npm test` が通る
- [ ] 手動確認: `chrome://extensions` で拡張を再読み込みし、追加・検索・既読化・削除・バッジ件数・フルタブ表示が従来どおり動く

## 決定事項
- テストフレームワークは Vitest（`/ask` での方針どおり）。Playwright による実機 E2E は今回の範囲外
- 共通化は ES modules（`type="module"`）で行い、バンドラは導入しない
- 言語レベルは ES2020 とする（`?.`・`??`・`import()` などを使ってよい。現状のコードは ES2018 相当で、書き換えは不要）
- `addItem` は `lib.js` に分離し、`AGENTS.md` に例外を明記する
- 同じ URL の再追加は現状維持（未読に戻る）。テストで仕様として固定する
- 挙動の変更はしない（リファクタリングとテスト追加のみ）

## 懸念点・未決事項
- トップレベル await は ES2022 のため、`popup.js` / `tab.js` では `init()` 関数を使った
- `addItem` は `popup.js` からしか使わず、`AGENTS.md` の「1か所でしか使わない関数は作らない」に反する。テスト容易性のための分離として許容するか、規約側に例外を書くか要確認
- `background.js` を module にしたあと、Chrome 側で service worker が正常に起動するか実機で確認が必要（未確認）
- 過去コミットの「migrate storage」処理は現在の `src/` に見当たらない。保存データの旧形式が残っている可能性は未確認
- テストファイルの置き場所（`tests/` を想定）と、ESLint 等の lint 導入は今回含めていない
