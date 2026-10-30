#!/bin/bash
# Local preparation only. Does not stage, commit, push, or delete source files.
set -eu
if [ "$(uname -s)" != Darwin ]; then
  echo '此工具需要在你的 Mac 上运行。'; exit 1
fi
PROJECT_REPO=$(cd "$(dirname "$0")/.." && pwd -P)
SELECTED=$(/usr/bin/osascript <<'APPLESCRIPT'
try
  set chosenFolders to choose folder with prompt "请选择要整理的项目文件夹，可按住 Command 多选。不要选择整个桌面。" with multiple selections allowed
  set paths to ""
  repeat with f in chosenFolders
    set p to POSIX path of f
    if p contains linefeed then error "暂不支持名称包含换行的文件夹。"
    set paths to paths & p & linefeed
  end repeat
  return paths
on error msg number n
  if n is -128 then return ""
  error msg number n
end try
APPLESCRIPT
)
if [ -z "$SELECTED" ]; then echo '已取消，未复制文件。'; exit 0; fi
mkdir -p "$PROJECT_REPO/projects"
REPORT=$(mktemp "$PROJECT_REPO/projects/import-report.XXXXXX")
printf '本地项目整理报告\n仅复制，不自动上传。\n\n排除：内部 Git、依赖、缓存、构建目录、常见凭据文件。\n构建目录中的模型也会被排除；如有必需模型，后续单独整理。\n符号链接不会展开复制，指向项目外部的链接会被跳过。\n\n' > "$REPORT"
while IFS= read -r SELECTED_PATH; do
  [ -n "$SELECTED_PATH" ] || continue
  SOURCE_DIR=$(cd "$SELECTED_PATH" && pwd -P)
  NAME=$(basename "$SOURCE_DIR")
  case "$PROJECT_REPO/" in "$SOURCE_DIR/"*)
    printf '跳过 %s：该目录包含当前仓库，不能递归复制。\n' "$NAME" >> "$REPORT"; continue;;
  esac
  case "$SOURCE_DIR/" in "$PROJECT_REPO/"*)
    printf '跳过 %s：已位于当前仓库中。\n' "$NAME" >> "$REPORT"; continue;;
  esac
  DEST="$PROJECT_REPO/projects/$NAME"
  if [ -e "$DEST" ] || [ -L "$DEST" ]; then
    printf '跳过 %s：目标已存在，未覆盖。\n' "$NAME" >> "$REPORT"; continue
  fi
  echo "正在整理：$NAME"
  if ! /usr/bin/rsync -rlt --safe-links \
    --exclude='.git' --exclude='node_modules' --exclude='.venv' --exclude='venv' \
    --exclude='__pycache__' --exclude='.cache' --exclude='.next' --exclude='.nuxt' \
    --exclude='dist' --exclude='build' --exclude='coverage' --exclude='.DS_Store' \
    --exclude='.env*' --exclude='*.pem' --exclude='*.key' --exclude='*.keystore' \
    --exclude='.ssh' --exclude='.aws' --exclude='.npmrc' --exclude='.pypirc' \
    --exclude='.netrc' --exclude='credentials*' \
    "$SOURCE_DIR/" "$DEST/"; then
    printf '\n%s：复制未完成，原文件保留；目标可能含部分副本。\n' "$NAME" >> "$REPORT"
    continue
  fi
  printf '\n已复制：%s\n' "$NAME" >> "$REPORT"
  /usr/bin/du -sh "$DEST" >> "$REPORT"
  printf '超过 GitHub 单文件 100 MiB 限制的文件（如有）：\n' >> "$REPORT"
  /usr/bin/find "$DEST" -type f -size +104857600c -print >> "$REPORT"
  printf '常见密钥特征命中的文件（仅路径，不输出内容；可能是示例误报）：\n' >> "$REPORT"
  if /usr/bin/grep -RIlE 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{24,}' "$DEST" >> "$REPORT"; then
    printf '以上文件需要进一步检查。\n' >> "$REPORT"
  else
    RC=$?
    if [ "$RC" -ne 1 ]; then printf '内容检查未完整完成，需人工核对。\n' >> "$REPORT"; fi
  fi
done <<< "$SELECTED"
printf '\n整理结束。未自动上传，也未改变原项目。常见规则不能保证发现所有敏感信息。\n请将此报告发给助手，先检查体积与文件清单，再决定提交哪些内容。\n' >> "$REPORT"
echo "报告已生成：$REPORT"
/usr/bin/open -a TextEdit "$REPORT"
