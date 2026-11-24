#!/bin/bash
# build.sh で zip を作り、概要とインストール方法を書いた RELEASE.md を生成する。
# それを本文にして GitHub CLI で公開リリースを作成し、以前のリリースとタグを削除する。
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

# 削除は公開リリースの作成が成功してから行うため、対象は先に決めておく。
# 新タグ以外の最新リリース1件と、新タグ以外のドラフトリリースを消す。
PREV_TAG=$(gh release list --limit 100 --json tagName --jq "[.[] | select(.tagName != \"${TAG}\")][0].tagName // empty")
DRAFT_TAGS=$(gh release list --limit 100 --json tagName,isDraft --jq ".[] | select(.isDraft and .tagName != \"${TAG}\") | .tagName")

./build.sh

cat > RELEASE.md <<NOTES
# ${TAG}

あとで読む記事を保存し、タイトルで検索できる Chrome 拡張機能です。
読んだ記事には既読マークが付きます。

## インストール方法

- Chrome ウェブストア: https://chrome.google.com/webstore/detail/mini-bookmarks/lipgpfampommaphglnnnjjojidmkdlkn
- zip から入れる場合: 添付の zip を展開し、\`chrome://extensions\` でデベロッパーモードを有効にして「パッケージ化されていない拡張機能を読み込む」から展開したフォルダを選ぶ
NOTES

# 公開リリースとして作成する。タグは HEAD のコミットへ作られる
gh release create "$TAG" "$ZIP" \
  --title "$TAG" \
  --notes-file RELEASE.md \
  --target "$(git rev-parse HEAD)"

delete_release() {
  local tag=$1
  if git ls-remote --exit-code --tags origin "refs/tags/${tag}" >/dev/null 2>&1; then
    gh release delete "$tag" --yes --cleanup-tag
  else
    # タグが無いドラフトは --cleanup-tag を付けない
    gh release delete "$tag" --yes
  fi
}

if [ -n "$PREV_TAG" ]; then
  delete_release "$PREV_TAG"
  echo "以前のリリース ${PREV_TAG} とタグを削除しました"
fi

while IFS= read -r DRAFT_TAG; do
  [ -n "$DRAFT_TAG" ] || continue
  [ "$DRAFT_TAG" = "$PREV_TAG" ] && continue
  delete_release "$DRAFT_TAG"
  echo "ドラフトリリース ${DRAFT_TAG} とタグを削除しました"
done <<< "$DRAFT_TAGS"

echo
echo "リリース ${TAG} を公開しました"
