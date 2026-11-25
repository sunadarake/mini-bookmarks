# mini bookmarks

<img src="./sample_images/bookmark_thumb.png">

## 目的

あとで読む記事を保存して、タイトルで検索できる Chrome 拡張機能。

通常のブックマークより小さく、開いた記事を一覧で確認できるようにした。

Chrome ウェブストアからもインストールできる。

https://chrome.google.com/webstore/detail/mini-bookmarks/lipgpfampommaphglnnnjjojidmkdlkn

## セットアップ

```bash
git clone <このリポジトリの URL>
cd mini-bookmarks

# Chrome で chrome://extensions を開き、デベロッパーモードを有効にする
# 「パッケージ化されていない拡張機能を読み込む」でこのディレクトリを選ぶ

# 配布用 zip を作る場合（dist/ に出力される）
./build.sh
```

## 使い方

ツールバーのアイコンを押してポップアップを開く。

<img src="./sample_images/sample.gif">

1. 保存したいページを開いて `Add +` を押す
2. 検索欄にタイトルの一部を入力して絞り込む。サイトの選択（完全一致、各候補に favicon 付き、ドロップダウン内の検索窓で候補を絞り込み可能）でも絞り込め、これらは AND で効く。サイト絞り込みはブラウザを閉じるまで維持される
3. 項目をクリックするとページが開き、既読になる。直前に開いた1件は薄いグレーで強調される
4. 「新しい順」「古い順」の toggle で並び順を切り替える。選択中の側がハイライトされる
5. `✕` で項目を削除する
6. `↗` で、同じ一覧を新しいタブで開く（タブ画面では追加はできない）
7. `☰` でオプションを開き、JSON のエクスポート/インポートや削除前確認の設定を行う

## 仕様

| 項目 | 内容 |
|:-|:-|
| 保存先 | `chrome.storage.local` のキー `MiniBookMark_Items` |
| 保存する値 | `url`、`hostName`、`rootUrl`、`title`、`createdAt` |
| 既読・直前の記事・サイト絞り込み | `chrome.storage.session` のキー `MiniBookMark_Session`（ブラウザ終了で消える） |
| 設定 | `chrome.storage.local` のキー `MiniBookMark_Settings`（削除前確認の既定は OFF、並び順の既定は新しい順） |
| 重複した URL | 古い項目を消して先頭に追加する |
| 検索 | タイトルの部分一致（大文字小文字を区別しない） |
| サイト絞り込み | ドロップダウンで `rootUrl` の完全一致。ドロップダウン内の検索窓で候補を部分一致で絞り込み。各候補に favicon を表示。タイトル検索とは AND。状態はブラウザ終了まで維持 |
| 並び順 | 「新しい順」「古い順」の toggle。`createdAt` 基準 |
| 表示件数 | 最初に 100 件を表示し、末尾付近までスクロールすると 100 件ずつ追加表示する。検索・並び替え・サイト絞り込みを変えると最初の 100 件に戻る |
| 空状態 | 0 件のときは案内を表示する（保存 0 件と絞り込み 0 件で文言を分ける） |
| バッジ | 保存件数を表示する |

## Contribution

機能の追加や不具合の修正の要望は、Issue で報告してください。

バグ修正や、テストを追加する Pull Request も歓迎します。

## License

- MIT
