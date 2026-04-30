#!/bin/bash
set -e

VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
ZIP_NAME="mini-bookmarks-v${VERSION}.zip"

mkdir -p dist

rm -f "dist/${ZIP_NAME}"

zip -r "dist/${ZIP_NAME}" \
  manifest.json \
  assets/ \
  src/

echo "Built: dist/${ZIP_NAME}"
