# mini bookmarks

あとで読む記事を保存・検索する Chrome 拡張機能（Manifest V3）。
ポップアップとフルタブ画面でブックマークの追加・検索・既読管理・削除ができ、オプション画面で JSON のエクスポート/インポートができる。

## 技術スタック
- 言語: JavaScript（ES2020、ES modules、ビルド工程なしの素の JS）
- フレームワーク: なし（DOM を直接操作する）
- パッケージ管理: pnpm（テスト用の devDependencies のみ。拡張機能本体は依存なし）
- テスト: Vitest（DOM のテストは jsdom）
- lint: ESLint（推奨ルールのみ。設定は `eslint.config.js`）

## コマンド
- セットアップ: `pnpm install`
- テスト: `pnpm test`（成功時は dot レポーターで簡潔に表示し、失敗時は詳細を表示する）
- lint: `pnpm run lint`
- ビルド（配布用 zip を `build/` に作成。作成前に同じ拡張機能名の旧バージョン zip を削除）: `./build.sh`
- リリース（一時ディレクトリに zip を作り、スクリプト内に組み込んだリリースノートで GitHub に公開リリースを作成。成功後に新バージョン以外のすべてのリリースとタグを削除。`gh` が必要。未コミットの変更があると止まる）: `./release.sh`
- 動作確認: `chrome://extensions` でデベロッパーモードを有効にし、このリポジトリを「パッケージ化されていない拡張機能」として読み込む
- 型チェック: 未導入

## ディレクトリ構成
- `manifest.json` 拡張機能の定義（バージョンはここが唯一の定義元。`build.sh` と `release.sh` がここから zip 名とタグを決める）
- `build.sh` / `release.sh` 配布用 zip を `build/` に作成するビルドと、一時ディレクトリの zip を GitHub に公開するリリース
- `generate_key.sh` `key.pem` から `manifest.json` の `key` を設定し、拡張機能 ID を固定する
- `src/lib.js` 共通処理（保存・バッジ・描画、popup とフルタブ画面で共通の一覧の初期化 `setupListView`、配列を変換する純粋関数）。`chrome.*` に触れない関数はここに置いてテストする
- `src/icons.js` Lucide のアイコンをインライン SVG で定義し、popup / フルタブ画面で共有する
- `src/background.js` サービスワーカー。起動・インストール時にバッジの件数を更新する
- `src/popup.html` / `src/popup.js` ポップアップ。現在のタブの追加、検索、既読化、削除、フルタブ画面とオプションを開く
- `src/tab.html` / `src/tab.js` フルタブ画面。一覧、検索、既読化、削除（追加はできない）とオプションを開く導線
- `src/options.html` / `src/options.js` オプション画面。JSON エクスポートと、ファイル選択・ドラッグ&ドロップによるインポート、削除前確認・一度に表示する記事数の設定、現在のバージョンの表示（`manifest.json` の `options_ui`）
- `src/common.css` ポップアップ・フルタブ・オプション共通のスタイル（色・角丸・影は CSS 変数で管理）、`src/tab.css` フルタブ専用
- `assets/img/` アイコン
- `tests/` Vitest のテスト（`lib.js` が対象）
- `todo/` 実装計画（`/todo-plan` で作成、`/todo-refine` で詰める、`NNN-todo.md` 形式）

## 仕様・注意点
- データは `chrome.storage.local` のキー `MiniBookMark_Items` に配列で保存する。要素は `{ url, hostName, rootUrl, title, createdAt }`。`rootUrl` はサイトのオリジン（`parseHost` の結果、`hostName` と同値）、`createdAt` は追加日時のミリ秒。既存項目は一覧の初回読み込み時に欠損分を補完する。キー名は `lib.js` の `STORAGE_KEY` で定義する
- 既読と直前に開いた URL は `chrome.storage.session` のキー `MiniBookMark_Session` に `{ openedUrls, lastOpenedUrl, siteUrl }` で保存する。`storage.local` には保存せず、ブラウザ終了で消える。`siteUrl` はサイト絞り込みの状態で、再び開いたときに復元する。キー名は `SESSION_KEY` で定義する
- 設定は `chrome.storage.local` のキー `MiniBookMark_Settings` に `{ confirmDelete, sortMode, pageSize }` で保存する。既定は `confirmDelete: false`（確認なしで削除）、`sortMode: "newest"`（新しい順、他は `"oldest"`）、`pageSize: 30`（一度に表示する記事数）。`pageSize` は 10〜100 の 10 記事単位で設定でき、オプション画面のプルダウンから変更する。キー名は `SETTINGS_KEY` で定義する。`confirmDelete` を ON にすると popup / フルタブ画面の削除時に `window.confirm()` を出し、設定はエクスポート/インポート対象外
- 同じ URL を追加した場合は古い項目を消して先頭に入れ直す（仕様としてテストで固定している）
- リンクをクリックすると既読になる。直前に開いた1件は `last-opened` クラスで薄いグレー背景にして強調する
- サイト絞り込みは `site-select`（カスタムドロップダウン）の完全一致のみで、タイトル検索と AND で併用する。ドロップダウン内の検索窓で `rootUrl` の部分一致により候補を絞り込める（検索窓は開くたびにリセット）。候補は保存済み `rootUrl` の重複なし昇順リストで、先頭の「すべてのサイト」で解除する。検索語に一致する候補が無ければ「該当するサイトがありません」を表示する。各候補と選択中の表示に favicon を付ける。`rootUrl` が空の項目はサイト条件では表示されないが、「すべてのサイト」では表示する。絞り込み状態はセッションに保存し、ブラウザを閉じるまで維持する
- 並び順は「新しい順」「古い順」の toggle ボタンで切り替えられる（`sortItems`）。`createdAt` 基準で、選択中のボタンに `active` を付けて現在の状態を示す。選択は設定に保存し、popup / フルタブ画面の両方に適用する
- 一覧は最初に設定の `pageSize`（既定 `PAGE_SIZE` = 30）件だけ描画し、末尾の `#list-sentinel` が画面付近に入るたびに `pageSize` 件ずつ追加描画する。検索・並び替え・サイト絞り込みを変えたときは `pageSize` 件に戻す。`Total` は全件数を表示する
- 一覧が 0 件のときは空状態の案内を表示する（保存 0 件と絞り込み 0 件で文言を分ける）
- デザインはライトテーマのみ。色・角丸・影は `src/common.css` の CSS 変数で管理し、ポップアップ・フルタブ・オプションの 3 画面で共通化する。オプション画面は中央寄せのカードレイアウトで、ドロップゾーンはクリックとキーボード（Enter / Space）で操作できる
- アイコンは Lucide のインライン SVG（`src/icons.js`）を使う。外部 CDN は CSP で読み込めないため使わない
- 項目の追加・削除のたびにバッジ（件数）を更新する
- `popup.js` / `tab.js` / `background.js` / `options.js` は `type="module"` で `lib.js` を import する。`popup.js` は `icons.js` も import する。トップレベル await は ES2022 のため使わない
- エクスポート JSON は `{ version, exportedAt, items }`。`read` は含めず、その他の状態は保持する。インポートは項目を先頭に追加し、同一 URL はインポート側を優先する（既読は取り込まない）

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
