#!/bin/zsh

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NEXT_ENV_FILE="$ROOT_DIR/next-env.d.ts"
TSCONFIG_FILE="$ROOT_DIR/tsconfig.json"
DIST_DIR="$ROOT_DIR/.next-e2e"

next_env_backup="$(mktemp)"
tsconfig_backup="$(mktemp)"

cp "$NEXT_ENV_FILE" "$next_env_backup"
cp "$TSCONFIG_FILE" "$tsconfig_backup"

cleanup() {
  cp "$next_env_backup" "$NEXT_ENV_FILE"
  cp "$tsconfig_backup" "$TSCONFIG_FILE"
  rm -f "$next_env_backup" "$tsconfig_backup"
  rm -rf "$DIST_DIR"
}

trap cleanup EXIT INT TERM HUP

rm -rf "$DIST_DIR"
cd "$ROOT_DIR"

playwright test "$@"
