#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required." >&2
  exit 1
fi

if [ $# -ne 1 ]; then
  echo "Usage: ./scripts/create-github-repo.sh owner/repo-name" >&2
  exit 1
fi

REPO_NAME="$1"

gh repo create "$REPO_NAME" --private --source=. --remote=origin --push

echo "Created and pushed to https://github.com/$REPO_NAME"
