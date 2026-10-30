#!/bin/bash
# Publish only the four prepared 3D-related project directories.
set -eu
REPO_DIR=$(cd "$(dirname "$0")/.." && pwd -P)
cd "$REPO_DIR"
BRANCH=video/bring-the-star-home
if [ "$(git branch --show-current)" != "$BRANCH" ]; then
  echo "请先切换到 $BRANCH 分支。未提交或上传。"; exit 1
fi
if ! git diff --cached --quiet; then
  echo '暂存区已有其他文件，请先保留并处理原有暂存内容。未更改暂存区。'; exit 1
fi
TARGETS=(projects/ThreeMotion projects/AnimeWorld projects/merge_garden projects/Gothic-Animation)
CHECK_LOG=$(mktemp "${TMPDIR:-/tmp}/project-upload-check.XXXXXX")
trap 'rm -f "$CHECK_LOG"' EXIT
BLOCKED=0
for DIR in "${TARGETS[@]}"; do
  if [ ! -d "$DIR" ]; then
    echo "缺少 $DIR，请先运行整理脚本。"; exit 1
  fi
  echo "检查 $DIR"
  du -sh "$DIR"
  if ! find "$DIR" -type f -size +104857600c -print > "$CHECK_LOG"; then
    echo '未能完成体积检查，停止上传。'; exit 1
  fi
  if [ -s "$CHECK_LOG" ]; then
    echo '以下文件超过 100 MiB：'; cat "$CHECK_LOG"; BLOCKED=1
  fi
  if ! find "$DIR" \( -name .git -o -name '.env' -o -name '.env.local' -o -name '*.pem' -o -name '*.key' -o -name id_rsa -o -name id_ed25519 \) -print > "$CHECK_LOG"; then
    echo '未能完成文件名检查，停止上传。'; exit 1
  fi
  if [ -s "$CHECK_LOG" ]; then
    echo '以下文件或目录需要检查，不会自动公开：'; cat "$CHECK_LOG"; BLOCKED=1
  fi
  if grep -RIlE 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|ghp_[0-9A-Za-z]{36}|github_pat_[0-9A-Za-z_]{20,}|sk-(proj-|ant-)?[0-9A-Za-z_-]{20,}' "$DIR" > "$CHECK_LOG"; then
    echo '以下文件命中常见密钥特征（只显示路径，可能有示例误报）：'
    cat "$CHECK_LOG"; BLOCKED=1
  else
    RC=$?
    if [ "$RC" -ne 1 ]; then echo '内容扫描未完整完成，停止上传。'; exit 1; fi
  fi
done
if [ "$BLOCKED" -ne 0 ]; then
  echo '上传暂停。请把以上文件路径和提示发给助手，不要发送密钥内容。'
  exit 1
fi
if ! git var GIT_AUTHOR_IDENT > /dev/null 2>&1; then
  echo '本机尚未配置有效的 Git 提交身份，未暂存或上传。请将此提示发给助手。'; exit 1
fi
echo '检查完成。开始提交这四个项目；其他目录和原项目保持不变。'
git add -- "${TARGETS[@]}"
if git diff --cached --quiet; then
  echo '四个项目没有需要新增提交的内容。'
else
  git diff --cached --stat
  git commit -m 'Import existing 3D-related projects for reuse assessment'
fi
git push origin "HEAD:$BRANCH"
echo '四个项目上传成功。请把最后的提交和推送结果发给助手。'
