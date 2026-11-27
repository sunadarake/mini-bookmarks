#!/bin/bash
# 一時ディレクトリに配布用 zip を作り、GitHub CLI で公開リリースする。
# 成功後に、新バージョン以外のリリースとタグを削除する。
set -euo pipefail

# どこから実行しても同じ結果になるよう、リポジトリのルートに移動する
cd "$(dirname "$0")"

for cmd in gh zip git; do
  command -v "$cmd" >/dev/null || { echo "${cmd} コマンドが必要です" >&2; exit 1; }
done

EXT_NAME=$(sed -n 's/.*"name": "\(.*\)".*/\1/p' package.json | head -1)
[ -n "$EXT_NAME" ] || { echo "package.json から拡張機能名を取得できません" >&2; exit 1; }
VERSION=$(sed -n 's/.*"version": "\(.*\)".*/\1/p' manifest.json | head -1)
[ -n "$VERSION" ] || { echo "manifest.json からバージョンを取得できません" >&2; exit 1; }
TAG="v${VERSION}"
ZIP_NAME="chrome-${EXT_NAME}-${TAG}.zip"

if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
  echo "タグ ${TAG} は既にあります。manifest.json のバージョンを上げてください" >&2
  exit 1
fi

# 未コミットの変更があると、リリースの内容とコミットがずれる
[ -z "$(git status --porcelain)" ] || { echo "未コミットの変更があります" >&2; exit 1; }

# GitHub は remote にないコミットを --target に指定できない（HTTP 422）
[ -n "$(git branch -r --contains HEAD)" ] || { echo "HEAD が remote に push されていません。先に push してください" >&2; exit 1; }

TMP_DIR=$(mktemp -d)
cleanup() {
  rm -rf "$TMP_DIR"
  echo "一時ディレクトリを削除しました: ${TMP_DIR}"
}
trap cleanup EXIT

ZIP_PATH="${TMP_DIR}/${ZIP_NAME}"

echo "リリース ${TAG} を準備しています"
echo "  一時ディレクトリ: ${TMP_DIR}"
echo

echo "1/3: 一時ディレクトリに zip を作成しています"
zip -rq "$ZIP_PATH" manifest.json assets/ src/ -x "*.DS_Store"
echo "  ${ZIP_NAME} を作成しました"
echo

NOTES=$(cat <<NOTES
# ${TAG}

あとで読む記事を保存し、タイトルで検索できる Chrome 拡張機能です。
読んだ記事には既読マークが付きます。

## インストール方法

- Chrome ウェブストア: https://chrome.google.com/webstore/detail/mini-bookmarks/lipgpfampommaphglnnnjjojidmkdlkn
- zip から入れる場合: 添付の zip を展開し、\`chrome://extensions\` でデベロッパーモードを有効にして「パッケージ化されていない拡張機能を読み込む」から展開したフォルダを選ぶ
NOTES
)

echo "2/3: GitHub に公開リリースを作成しています"
gh release create "$TAG" "$ZIP_PATH" \
  --title "$TAG" \
  --notes "$NOTES" \
  --target "$(git rev-parse HEAD)"
echo "  リリース ${TAG} を作成しました"
echo

echo "3/3: 以前のリリースとタグを削除しています"

delete_release() {
  local tag=$1
  if git ls-remote --exit-code --tags origin "refs/tags/${tag}" >/dev/null 2>&1; then
    gh release delete "$tag" --yes --cleanup-tag
  else
    # タグが無いドラフトは --cleanup-tag を付けない
    gh release delete "$tag" --yes
  fi
}

PREVIOUS_TAGS=$(gh api --paginate "repos/{owner}/{repo}/releases" --jq '.[].tag_name')
DELETED=0
while IFS= read -r PREVIOUS_TAG; do
  [ -n "$PREVIOUS_TAG" ] || continue
  [ "$PREVIOUS_TAG" = "$TAG" ] && continue
  delete_release "$PREVIOUS_TAG"
  echo "  ${PREVIOUS_TAG} を削除しました"
  DELETED=$((DELETED + 1))
done <<< "$PREVIOUS_TAGS"

if [ "$DELETED" -eq 0 ]; then
  echo "  削除する以前のリリースはありません"
fi

echo
echo "リリース ${TAG} を公開しました"
