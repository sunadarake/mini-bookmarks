#!/bin/bash
# 配布用の zip を build/ に作成する。
# zip には manifest.json、assets/、src/ だけを入れる。
set -euo pipefail

# どこから実行しても同じ結果になるよう、リポジトリのルートに移動する
cd "$(dirname "$0")"

command -v zip >/dev/null || { echo "zip コマンドが必要です" >&2; exit 1; }

EXT_NAME=$(sed -n 's/.*"name": "\(.*\)".*/\1/p' package.json | head -1)
[ -n "$EXT_NAME" ] || { echo "package.json から拡張機能名を取得できません" >&2; exit 1; }
VERSION=$(sed -n 's/.*"version": "\(.*\)".*/\1/p' manifest.json | head -1)
[ -n "$VERSION" ] || { echo "manifest.json からバージョンを取得できません" >&2; exit 1; }

BUILD_DIR="build"
ZIP_NAME="${EXT_NAME}-v${VERSION}.zip"

echo "ビルドを開始します"
echo "  バージョン: ${VERSION}"
echo "  出力先: ${BUILD_DIR}/${ZIP_NAME}"
echo

echo "1/3: 以前のバージョンの zip を削除しています"
mkdir -p "$BUILD_DIR"
rm -f "$BUILD_DIR/${EXT_NAME}-v"*.zip
echo "  ${BUILD_DIR}/${EXT_NAME}-v*.zip を削除しました"
echo

echo "2/3: zip を作成しています"
zip -rq "${BUILD_DIR}/${ZIP_NAME}" manifest.json assets/ src/ -x "*.DS_Store"
echo "  ${BUILD_DIR}/${ZIP_NAME} を作成しました"
echo

echo "3/3: 結果を確認しています"
SIZE=$(du -h "${BUILD_DIR}/${ZIP_NAME}" | cut -f1)
echo "完了: ${BUILD_DIR}/${ZIP_NAME} (${SIZE})"
echo
echo "次の手順:"
echo "  1. Chrome Web Store のデベロッパーダッシュボードで mini bookmarks を開く"
echo "  2. 「パッケージ」から ${BUILD_DIR}/${ZIP_NAME} をアップロードする"
echo "  3. 変更内容を確認して審査に提出する"
echo "  4. 提出後に git tag v${VERSION} を付ける"
