# mini bookmarks

あとで読む記事を保存・検索する Chrome 拡張機能（Manifest V3）。
ポップアップとフルタブ画面でブックマークの追加・検索・既読管理・削除・お気に入り管理ができ、オプション画面で JSON のエクスポート/インポートができる。

## 技術スタック
- 言語: JavaScript（ES2020、ES modules、ビルド工程なしの素の JS）
- フレームワーク: なし（DOM を直接操作する）
- パッケージ管理: npm（テスト用の devDependencies のみ。拡張機能本体は依存なし）
- テスト: Vitest（DOM のテストは jsdom）
- lint: ESLint（推奨ルールのみ。設定は `eslint.config.js`）

## コマンド
- セットアップ: `npm install`
- テスト: `npm test`（成功時は dot レポーターで簡潔に表示し、失敗時は詳細を表示する）
- lint: `npm run lint`
- ビルド（テスト実行後、配布用 zip を `dist/` に作成）: `./build.sh`
- リリース（ビルド後、`RELEASE.md` を生成し GitHub に公開リリースを作成。成功後に以前のリリースとタグを削除。`gh` が必要。未コミットの変更があると止まる）: `./publish.sh`
- 動作確認: `chrome://extensions` でデベロッパーモードを有効にし、このリポジトリを「パッケージ化されていない拡張機能」として読み込む
- 型チェック: 未導入

## ディレクトリ構成
- `manifest.json` 拡張機能の定義（バージョンはここが唯一の定義元。`build.sh` がここから zip 名を決める）
- `src/lib.js` 共通処理（保存・バッジ・描画と、配列を変換する純粋関数）。`chrome.*` に触れない関数はここに置いてテストする
- `src/background.js` サービスワーカー。起動・インストール時にバッジの件数を更新する
- `src/popup.html` / `src/popup.js` ポップアップ。現在のタブの追加、検索、既読化、削除、フルタブ画面とオプションを開く
- `src/tab.html` / `src/tab.js` フルタブ画面。一覧、検索、既読化、削除（追加はできない）とオプションを開く導線
- `src/options.html` / `src/options.js` オプション画面。JSON エクスポートと、ファイル選択・ドラッグ&ドロップによるインポート、削除前確認の設定、現在のバージョンの表示（`manifest.json` の `options_ui`）
- `src/common.css` ポップアップ・フルタブ・オプション共通のスタイル、`src/tab.css` フルタブ専用
- `assets/img/` アイコン
- `tests/` Vitest のテスト（`lib.js` が対象）
- `todo/` 実装計画（`/todo-plan` で作成、`/todo-refine` で詰める、`NNN-todo.md` 形式）

## 仕様・注意点
- データは `chrome.storage.local` のキー `MiniBookMark_Items` に配列で保存する。要素は `{ url, hostName, title }`（お気に入りは `favorite: true` を付与）。キー名は `lib.js` の `STORAGE_KEY` で定義する
- 既読と直前に開いた URL は `chrome.storage.session` のキー `MiniBookMark_Session` に `{ openedUrls, lastOpenedUrl }` で保存する。`storage.local` には保存せず、ブラウザ終了で消える。キー名は `SESSION_KEY` で定義する
- 設定は `chrome.storage.local` のキー `MiniBookMark_Settings` に `{ confirmDelete }` で保存する。既定は `false`（確認なしで削除）。キー名は `SETTINGS_KEY` で定義する。オプションで ON にすると popup / フルタブ画面の削除時に `window.confirm()` を出し、設定はエクスポート/インポート対象外
- 同じ URL を追加した場合は古い項目を消して先頭に入れ直す（仕様としてテストで固定している）
- リンクをクリックすると既読になる。直前に開いた1件は `last-opened` クラスで薄いグレー背景にして強調する
- 星ボタンでお気に入り（`favorite`）を切り替える。popup / フルタブ画面の「すべて」「お気に入り」で一覧を切り替えられ、検索と併用できる
- 全件表示のときは記事の行をドラッグ&ドロップで並び替えられる（`moveItem`）。検索中とお気に入り絞り込み中はドラッグ無効
- 項目の追加・削除のたびにバッジ（件数）を更新する
- `popup.js` / `tab.js` / `background.js` / `options.js` は `type="module"` で `lib.js` を import する。トップレベル await は ES2022 のため使わない
- エクスポート JSON は `{ version, exportedAt, items }`。`read` は含めず、`favorite` などの状態は保持する。インポートは項目を先頭に追加し、同一 URL はインポート側を優先する（既読は取り込まない）

## 作業の進め方
- 作業の前に、関連するコードと仕様を読んで理解する
- 不明点や判断が分かれる点は、推測で進めずに質問する
- 依頼された範囲だけを変更する。範囲外で必要な変更に気づいたら報告する
- 作業の完了前に、テスト・lint・型チェックを実行して通ることを確認する

## コーディング規約
- 既存コードの書き方（命名、構成、エラー処理）に合わせる
- コードはシンプルにする。1か所でしか使わない抽象化やヘルパー関数は作らない（テスト対象の純粋関数を `lib.js` に切り出す場合は例外）
- コメントは日本語（UTF-8）で、コードを読んでも分からない「なぜ」だけを書く
- 不要な防御処理（過剰なnullチェック、エラーの握りつぶし）を書かない
- 使わなくなったコード、デバッグ用のログは残さない

## コミット
- メッセージは日本語で、1行目は変更内容が一目で分かる50文字程度にする
- 必要な場合のみ、空行のあとに補足を書く
- 署名・クレジット行（`Co-Authored-By` など）は含めない

## 禁止事項
- `.env`、認証情報、秘密鍵をコミットしない
- `git push`、`git reset --hard`、強制的な上書きをしない
- テストを通すためにテストを弱めたり、無効にしたりしない
