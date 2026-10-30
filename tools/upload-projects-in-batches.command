#!/bin/bash
# Read a committed project snapshot and publish it in small, resumable batches.
# Never checkout, reset, or modify the user's worktree or ordinary Git index.
set -euo pipefail
cd "${1:-.}"
REPO_DIR=$(git rev-parse --show-toplevel)
cd "${REPO_DIR}"
if [ -z "${GIT_SSH_COMMAND:-}" ]; then
  export GIT_SSH_COMMAND='ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=6'
fi
STATE=$(git rev-parse --git-path project-batch-upload.state)
if [ -f "${STATE}" ]; then
  SOURCE_COMMIT=$(sed -n '1p' "${STATE}")
  UPLOAD_BRANCH=$(sed -n '2p' "${STATE}")
  [[ "${SOURCE_COMMIT}" =~ ^[a-f0-9]{40,64}$ ]] || { echo '进度记录无效，停止。'; exit 1; }
  case "${UPLOAD_BRANCH}" in projects/import-*) ;; *) echo '进度分支无效，停止。'; exit 1;; esac
  git check-ref-format --branch "${UPLOAD_BRANCH}" >/dev/null
  git cat-file -e "${SOURCE_COMMIT}^{commit}"
  git rev-parse --verify "refs/heads/${UPLOAD_BRANCH}" >/dev/null
  echo "继续上传原提交 ${SOURCE_COMMIT}"
else
  SOURCE_COMMIT=$(git rev-parse HEAD)
  git cat-file -e "${SOURCE_COMMIT}:projects" || { echo '当前提交没有 projects 目录，请将提示发给助手。'; exit 1; }
  git fetch origin video/bring-the-star-home
  BASE_COMMIT=$(git rev-parse FETCH_HEAD)
  UPLOAD_BRANCH="projects/import-$(date +%Y%m%d-%H%M%S)"
  git check-ref-format --branch "${UPLOAD_BRANCH}" >/dev/null
  git update-ref "refs/heads/${UPLOAD_BRANCH}" "${BASE_COMMIT}" ''
  printf '%s\n%s\n' "${SOURCE_COMMIT}" "${UPLOAD_BRANCH}" > "${STATE}"
fi
echo "分批上传到：${UPLOAD_BRANCH}"
echo '原项目、本地原提交、当前分支和暂存区保持不变。'
push_batch() {
  if ! git -c pack.threads=2 push origin "refs/heads/${UPLOAD_BRANCH}:refs/heads/${UPLOAD_BRANCH}"; then
    echo '本批连接中断。已保存进度；再次运行同一脚本即可继续，不要重新提交所有项目。'
    exit 1
  fi
}
# Retry any locally saved batch before creating further commits.
push_batch
WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/project-batch-index.XXXXXX")
trap 'rm -rf "${WORK_DIR}"' EXIT
export GIT_INDEX_FILE="${WORK_DIR}/index"
git read-tree "refs/heads/${UPLOAD_BRANCH}"
LIST="${WORK_DIR}/files"
: > "${LIST}"
for NAME in extension Gothic-Animation PORTRAIT_LAB merge_garden ThreeMotion AnimeWorld AIRetouch remotion-demo; do
  git ls-tree -r -l -z "${SOURCE_COMMIT}" -- "projects/${NAME}/" >> "${LIST}"
done
if [ ! -s "${LIST}" ]; then echo '原提交中没有找到项目文件，停止。'; exit 1; fi
BATCH_FILES=0
BATCH_BYTES=0
BATCH_NUMBER=0
TOTAL_FILES=0
flush_batch() {
  [ "${BATCH_FILES}" -gt 0 ] || return 0
  local TREE PARENT NEXT
  TREE=$(git write-tree)
  PARENT=$(git rev-parse "refs/heads/${UPLOAD_BRANCH}")
  NEXT=$(git commit-tree "${TREE}" -p "${PARENT}" -m 'Import local project files in a small batch')
  git update-ref "refs/heads/${UPLOAD_BRANCH}" "${NEXT}" "${PARENT}"
  BATCH_NUMBER=$((BATCH_NUMBER+1))
  echo "上传批次 ${BATCH_NUMBER}：${BATCH_FILES} 个文件，约 $((BATCH_BYTES/1048576)) MiB"
  push_batch
  BATCH_FILES=0
  BATCH_BYTES=0
}
while IFS= read -r -d '' ENTRY; do
  HEADER=${ENTRY%%$'\t'*}
  FILE_PATH=${ENTRY#*$'\t'}
  read -r FILE_MODE OBJECT_TYPE OBJECT_ID FILE_BYTES <<< "${HEADER}"
  if [ "${OBJECT_TYPE}" != blob ]; then
    echo "不支持的项目条目：${FILE_PATH}，停止。"; exit 1
  fi
  if [ "${FILE_BYTES}" -gt 104857600 ]; then
    echo "单文件超过 GitHub 限制：${FILE_PATH}。进度保留，停止。"; exit 1
  fi
  EXISTING=$(git ls-files --stage -- "${FILE_PATH}")
  if [ -n "${EXISTING}" ]; then
    read -r OLD_MODE OLD_OBJECT REST <<< "${EXISTING}"
    if [ "${OLD_MODE}" = "${FILE_MODE}" ] && [ "${OLD_OBJECT}" = "${OBJECT_ID}" ]; then continue; fi
  fi
  if [ "${BATCH_FILES}" -gt 0 ] && { [ $((BATCH_BYTES+FILE_BYTES)) -gt 20971520 ] || [ "${BATCH_FILES}" -ge 100 ]; }; then
    flush_batch
  fi
  git update-index --add --cacheinfo "${FILE_MODE},${OBJECT_ID},${FILE_PATH}"
  BATCH_FILES=$((BATCH_FILES+1))
  BATCH_BYTES=$((BATCH_BYTES+FILE_BYTES))
  TOTAL_FILES=$((TOTAL_FILES+1))
done < "${LIST}"
flush_batch
echo "完成。本次新增处理 ${TOTAL_FILES} 个项目文件。"
echo "已上传分支：${UPLOAD_BRANCH}"
echo '请把以上分支名和终端最后几行发给助手。无需切换或重置原分支。'
