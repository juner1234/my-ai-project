#!/usr/bin/env bash
# 标注架构回归测试：编译纯逻辑模块后在 Node 中做数据级校验（无需浏览器、无需新依赖）。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${TMPDIR:-/tmp}/dancefx-regress"
rm -rf "$OUT" && mkdir -p "$OUT"

cd "$ROOT"
npx tsc src/annotations.ts src/api.ts \
  --outDir "$OUT" --module commonjs --target es2020 \
  --moduleResolution node --skipLibCheck --esModuleInterop

printf '{"type":"commonjs"}' > "$OUT/package.json"
cp tests/annotations.regress.cjs "$OUT/"
node "$OUT/annotations.regress.cjs"
