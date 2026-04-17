#!/usr/bin/env bash
# Reset persisted Orbit state so E2E tests launch in a clean state
# (onboarding visible, no saved preferences).
#
# Run before the test suite, or once locally when you want to simulate
# a first launch.
set -euo pipefail

BUNDLE_ID="dev.expo.orbit"
ELECTRON_APP_NAME="expo-orbit"

case "$(uname -s)" in
  Darwin)
    # MMKV default path for non-sandboxed macOS apps (Release build).
    rm -rf "$HOME/Documents/mmkv" 2>/dev/null || true

    # Sandboxed (Debug) container paths.
    rm -rf "$HOME/Library/Containers/$BUNDLE_ID" 2>/dev/null || true

    # electron-store / userData for the Electron build.
    rm -rf "$HOME/Library/Application Support/$ELECTRON_APP_NAME" 2>/dev/null || true
    ;;
  Linux)
    rm -rf "$HOME/.config/$ELECTRON_APP_NAME" 2>/dev/null || true
    ;;
  MINGW*|MSYS*|CYGWIN*)
    # Windows paths aren't meaningful under a POSIX shell; handled in CI
    # separately if needed.
    ;;
esac

echo "Orbit state reset."
