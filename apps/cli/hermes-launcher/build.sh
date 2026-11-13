#!/bin/bash
# Spike: build `orbit-cli` as a small native launcher that runs the CLI's JS
# on hermes-node, linking the Hermes framework shipped inside Expo Orbit.app
# (@executable_path/../Frameworks) instead of bundling Node via pkg.
#
# Inputs (spike paths): HN_EMBED (hermes-node's build-apple-embed-lib.sh output),
# HERMES_SRC (facebook/hermes checkout matching the app's hermesvm), JSI_DIR,
# HERMES_FW_DIR (directory containing hermesvm.framework).
set -euo pipefail
cd "$(dirname "$0")"
clang++ -std=c++20 -O2 -arch arm64 -mmacosx-version-min=13.0 main.cpp \
  -I"$HN_EMBED/include" -I"$HERMES_SRC/API" -I"$HERMES_SRC/public" -I"$JSI_DIR" \
  -F"$HERMES_FW_DIR" -framework hermesvm \
  "$HN_EMBED/lib/libhermes-node-embed.a" -lresolv -framework CoreFoundation -framework Security \
  -Wl,-rpath,@executable_path/../Frameworks -o orbit-cli
strip -x orbit-cli
