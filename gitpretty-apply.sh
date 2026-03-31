#!/usr/bin/env bash

set -euo pipefail

# Apply gitpretty's per-file beautification so GitHub file history shows
# readable, themed commit messages for each file.

REPO_PATH="${1:-.}"
INSTALL_HOOKS="${2:-}"
GITPRETTY_HOME="${HOME}/.gitpretty"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required but was not found on PATH"
  exit 1
fi

if [ ! -d "${REPO_PATH}/.git" ]; then
  echo "Target is not a git repository: ${REPO_PATH}"
  echo "Usage: $0 [repo-path] [--hooks]"
  exit 1
fi

if [ ! -d "${GITPRETTY_HOME}" ]; then
  echo "Installing gitpretty into ${GITPRETTY_HOME} ..."
  git clone https://github.com/nirholas/gitpretty.git "${GITPRETTY_HOME}"
fi

chmod +x "${GITPRETTY_HOME}"/*.sh "${GITPRETTY_HOME}"/scripts/*.sh

if [ "${INSTALL_HOOKS}" = "--hooks" ]; then
  echo "Installing gitpretty hooks in ${REPO_PATH} ..."
  (
    cd "${REPO_PATH}"
    "${GITPRETTY_HOME}"/scripts/emoji-hooks.sh install
  )
fi

echo "Running per-file beautify commits in ${REPO_PATH} ..."
"${GITPRETTY_HOME}"/emoji-file-commits.sh "${REPO_PATH}"

echo "Done. Review with: git -C ${REPO_PATH} log --oneline -n 20"


