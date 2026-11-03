#!/bin/bash
# build.sh で zip を作り、概要とインストール方法を書いた RELEASE.md を生成する。
# それを本文にして、GitHub CLI で draft のリリースを作成する（タグは公開時に作られる）。
set -euo pipefail

# どこから実行しても同じ結果になるよう、リポジトリのルートに移動する
cd "$(dirname "$0")"

command -v gh >/dev/null || { echo "gh (GitHub CLI) が必要です" >&2; exit 1; }

VERSION=$(sed -n 's/.*"version": "\(.*\)".*/\1/p' manifest.json | head -1)
[ -n "$VERSION" ] || { echo "manifest.json からバージョンを取得できません" >&2; exit 1; }
TAG="v${VERSION}"
ZIP="dist/mini-bookmarks-v${VERSION}.zip"

if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
  echo "タグ ${TAG} は既にあります。manifest.json のバージョンを上げてください" >&2
  exit 1
fi

# 未コミットの変更があると、リリースの内容とコミットがずれる
[ -z "$(git status --porcelain)" ] || { echo "未コミットの変更があります" >&2; exit 1; }

# GitHub は remote にないコミットを --target に指定できない（HTTP 422）
[ -n "$(git branch -r --contains HEAD)" ] || { echo "HEAD が remote に push されていません。先に push してください" >&2; exit 1; }

./build.sh

cat > RELEASE.md <<NOTES
# ${TAG}

あとで読む記事を保存し、タイトルで検索できる Chrome 拡張機能です。
読んだ記事には既読マークが付きます。

## インストール方法

- Chrome ウェブストア: https://chrome.google.com/webstore/detail/mini-bookmarks/lipgpfampommaphglnnnjjojidmkdlkn
- zip から入れる場合: 添付の zip を展開し、\`chrome://extensions\` でデベロッパーモードを有効にして「パッケージ化されていない拡張機能を読み込む」から展開したフォルダを選ぶ
NOTES

# ドラフトで作成する。タグは公開時に HEAD のコミットへ作られる
gh release create "$TAG" "$ZIP" \
  --draft \
  --title "$TAG" \
  --notes-file RELEASE.md \
  --target "$(git rev-parse HEAD)"

echo
echo "ドラフトを作成しました。GitHub の Releases で内容を確認して公開してください"
