#!/bin/bash
# React Native compiles against its own copy of JSI (ReactCommon/jsi), which
# has to be the JSI the Hermes it links was built with; otherwise the app
# builds and then crashes on mismatched vtables. react-native-macos 0.83 ships
# an older JSI than the Hermes we use, so `pod install` replaces it with the
# pinned Hermes's copy (from scripts/hermes-prebuilt.sh or the Hermes checkout
# of scripts/hermes-node.sh).
#
#   vendor-jsi.sh <hermes API/jsi/jsi dir>   copy it into react-native-macos
#   vendor-jsi.sh --check                    fail if what's there isn't the
#                                            copy (e.g. yarn install restored
#                                            React Native's own)
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../../../.." && pwd)
RN_PATH=$(cd "$REPO_ROOT" && node -p "path.dirname(require.resolve('react-native-macos/package.json'))")
DEST="$RN_PATH/ReactCommon/jsi/jsi"
MARKER="$DEST/.orbit-vendored-jsi"

if [[ "${1:-}" == "--check" ]]; then
  if [[ ! -f "$MARKER" ]] || ! (cd "$DEST" && shasum -a 256 -c "$MARKER" >/dev/null 2>&1); then
    echo "error: react-native-macos's JSI isn't the one Hermes was built with (did yarn install run after pod install?). Run \`pod install\` in apps/menu-bar/macos." >&2
    exit 1
  fi
  exit 0
fi

SRC=${1:?usage: $0 <hermes API/jsi/jsi dir> | --check}
[[ -f "$SRC/jsi.h" && -f "$SRC/hermes-interfaces.h" ]] || {
  echo "error: $SRC doesn't look like Hermes's API/jsi/jsi" >&2
  exit 1
}

rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$SRC/." "$DEST/"
# This JSI renamed hermes.h to hermes-interfaces.h; React Native 0.83 still
# includes the old name.
cat > "$DEST/hermes.h" <<'H'
// Added by Orbit's scripts/vendor-jsi.sh: this JSI calls the header
// hermes-interfaces.h; React Native 0.83 still includes jsi/hermes.h.
#pragma once
#include <jsi/hermes-interfaces.h>
H
(cd "$DEST" && find . -type f ! -name .orbit-vendored-jsi | sort | xargs shasum -a 256) > "$MARKER"
