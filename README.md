# mini bookmarks

<img src="./sample_images/bookmark_thumb.png">

## 目的

あとで読む記事を保存して、タイトルで検索できる Chrome 拡張機能。
通常のブックマークより小さく、読んだかどうかを一覧で確認できるようにした。

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
2. 検索欄にタイトルの一部を入力して絞り込む
3. 項目をクリックするとページが開き、既読になる
4. `✕` で項目を削除する
5. `↗` で、同じ一覧を新しいタブで開く（タブ画面では追加はできない）

## 仕様

| 項目 | 内容 |
|:-|:-|
| 保存先 | `chrome.storage.local` のキー `MiniBookMark_Items` |
| 保存する値 | `url`、`hostName`、`title`、`read` |
| 重複した URL | 古い項目を消して先頭に追加する |
| 検索 | タイトルの部分一致（大文字小文字を区別しない） |
| バッジ | 保存件数を表示する |

## Contribution

機能の追加や不具合の修正の要望は、Issue で報告してください。

バグ修正や、テストを追加する Pull Request も歓迎します。

## License

- MIT
