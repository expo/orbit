#!/usr/bin/env bash
# Reset persisted Orbit state so E2E tests launch in a clean state
# (onboarding visible, no saved preferences).
#
# MMKV data is stored at ~/.expo/orbit/ (see packages/common-types/src/storage.ts).
set -euo pipefail

ORBIT_DATA_DIR="$HOME/.expo/orbit"
ELECTRON_APP_NAME="expo-orbit"

echo "[e2e] Resetting Orbit state..."

# MMKV storage used by both macOS native and Electron builds.
if [ -d "$ORBIT_DATA_DIR" ]; then
  rm -rf "$ORBIT_DATA_DIR"
  echo "[e2e] Cleared $ORBIT_DATA_DIR"
fi

case "$(uname -s)" in
  Darwin)
    # electron-store / userData for the Electron build.
    rm -rf "$HOME/Library/Application Support/$ELECTRON_APP_NAME" 2>/dev/null || true
    ;;
  Linux)
    rm -rf "$HOME/.config/$ELECTRON_APP_NAME" 2>/dev/null || true
    ;;
esac

echo "[e2e] Orbit state reset."
