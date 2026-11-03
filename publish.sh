#!/bin/bash
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

./build.sh

# 前回のタグ以降のコミットを載せる。タグがなければ全コミットを載せる
PREV_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
RANGE=${PREV_TAG:+${PREV_TAG}..}HEAD

{
  echo "# ${TAG}"
  echo
  echo "## 変更内容"
  git log "$RANGE" --no-merges --pretty='- %s'
} > RELEASE.md

# ドラフトで作成する。タグは公開時に HEAD のコミットへ作られる
gh release create "$TAG" "$ZIP" \
  --draft \
  --title "$TAG" \
  --notes-file RELEASE.md \
  --target "$(git rev-parse HEAD)"

echo
echo "ドラフトを作成しました。GitHub の Releases で内容を確認して公開してください"
