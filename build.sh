#!/bin/bash
# テストを実行してから、配布用の zip を dist/ に作成する。
# zip には manifest.json、assets/、src/ だけを入れる。
set -euo pipefail

# どこから実行しても同じ結果になるよう、リポジトリのルートに移動する
cd "$(dirname "$0")"

command -v zip >/dev/null || { echo "zip コマンドが必要です" >&2; exit 1; }

VERSION=$(sed -n 's/.*"version": "\(.*\)".*/\1/p' manifest.json | head -1)
[ -n "$VERSION" ] || { echo "manifest.json からバージョンを取得できません" >&2; exit 1; }
ZIP_NAME="mini-bookmarks-v${VERSION}.zip"

# テストが通らない状態で配布物を作らない
npm test

mkdir -p dist
rm -f "dist/${ZIP_NAME}"

zip -rq "dist/${ZIP_NAME}" manifest.json assets/ src/ -x "*.DS_Store"

echo "Built: dist/${ZIP_NAME}"
echo
echo "次の手順:"
echo "  1. Chrome Web Store のデベロッパーダッシュボードで mini bookmarks を開く"
echo "  2. 「パッケージ」から dist/${ZIP_NAME} をアップロードする"
echo "  3. 変更内容を確認して審査に提出する"
echo "  4. 提出後に git tag v${VERSION} を付ける"
