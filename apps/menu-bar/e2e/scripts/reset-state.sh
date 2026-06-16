#!/usr/bin/env bash
# Reset persisted Orbit state so E2E tests launch in a clean state
# (onboarding visible, no saved preferences).
#
# MMKV data is stored at ~/.expo/orbit/ (see packages/common-types/src/storage.ts).
set -euo pipefail

ORBIT_DATA_DIR="$HOME/.expo/orbit"
# Must match USER_DATA_DIR in wdio.electron.ts. Chromedriver launches Electron
# with this --user-data-dir so localStorage-backed MMKV persists across runs.
E2E_USER_DATA_DIR="${TMPDIR:-/tmp}"
E2E_USER_DATA_DIR="${E2E_USER_DATA_DIR%/}/orbit-e2e-user-data"

echo "[e2e] Resetting Orbit state..."

# MMKV storage used by the macOS native build (Electron uses the pinned
# user-data-dir below instead, since Platform.OS is 'web' in the renderer).
if [ -d "$ORBIT_DATA_DIR" ]; then
  rm -rf "$ORBIT_DATA_DIR"
  echo "[e2e] Cleared $ORBIT_DATA_DIR"
fi

if [ -d "$E2E_USER_DATA_DIR" ]; then
  rm -rf "$E2E_USER_DATA_DIR"
  echo "[e2e] Cleared $E2E_USER_DATA_DIR"
fi

echo "[e2e] Orbit state reset."
