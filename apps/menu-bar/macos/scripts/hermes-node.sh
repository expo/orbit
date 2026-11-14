#!/bin/bash
# Fetches and builds hermes-node (https://github.com/gabrieldonadel/hermes-node),
# which the CLI runs on instead of a pkg-bundled Node.
#
# hermes-node pins the facebook/hermes commit (its `hermes` submodule) that
# the app's Hermes is built from too: the Podfile points
# REACT_NATIVE_OVERRIDE_HERMES_DIR at that checkout, and the JSI vendored into
# react-native-macos (patches/react-native-macos+*.patch) must match it.
#
#   hermes-node.sh fetch   clone/update the pinned checkout; prints the Hermes
#                          source dir
#   hermes-node.sh build   also build the embed library, headers and hermesc;
#                          prints the output dir
#
# HERMES_NODE_DIR: use an existing local checkout instead (for hermes-node
# development); it is built as-is.
# HERMES_NODE_ARCHS: architectures to build (default "arm64 x86_64"; always
# both, independent of Xcode's ARCHS, so Debug and Release share one build).
set -euo pipefail

HERMES_NODE_REPO=https://github.com/gabrieldonadel/hermes-node.git
HERMES_NODE_REF=5c1c723222e776537c0b7ed663f28c5b8ae723d5

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT="$SCRIPT_DIR/../vendor/hermes-node"
REPO_ROOT=$(cd "$SCRIPT_DIR/../../../.." && pwd)

log() {
  echo "[hermes-node] $*" >&2
}

fetch() {
  if [[ -n "${HERMES_NODE_DIR:-}" ]]; then
    SRC=$(cd "$HERMES_NODE_DIR" && pwd)
    return
  fi
  SRC="$ROOT/src"
  if [[ "$(git -C "$SRC" rev-parse HEAD 2>/dev/null || true)" != "$HERMES_NODE_REF" ]]; then
    log "fetching $HERMES_NODE_REF"
    mkdir -p "$SRC"
    git -C "$SRC" init -q
    git -C "$SRC" fetch -q --depth 1 "$HERMES_NODE_REPO" "$HERMES_NODE_REF"
    git -C "$SRC" checkout -q --force FETCH_HEAD
  fi
  # Shallow submodule fetch by commit; facebook/hermes is large.
  if ! git -C "$SRC/hermes" rev-parse HEAD >/dev/null 2>&1 ||
     [[ "$(git -C "$SRC/hermes" rev-parse HEAD)" != "$(git -C "$SRC" ls-tree HEAD hermes | awk '{print $3}')" ]]; then
    log "fetching hermes submodule"
    git -C "$SRC" submodule update -q --init --depth 1 hermes
  fi
}

check_jsi() {
  # The JSI react-native-macos compiles against has to be the one this Hermes
  # was written for; otherwise the app builds and crashes on vtable mismatch.
  local vendored="$REPO_ROOT/node_modules/react-native-macos/ReactCommon/jsi/jsi/jsi.h"
  if [[ -f "$vendored" ]] && ! cmp -s "$vendored" "$SRC/hermes/API/jsi/jsi/jsi.h"; then
    log "error: react-native-macos's vendored JSI does not match hermes $(git -C "$SRC/hermes" rev-parse --short HEAD)."
    log "Re-vendor it from $SRC/hermes/API/jsi/jsi and regenerate patches/react-native-macos+*.patch."
    exit 1
  fi
}

build() {
  local out="$ROOT/out"
  local stamp
  stamp="$(git -C "$SRC" rev-parse HEAD)$(git -C "$SRC" status --porcelain | shasum | cut -c1-8) ${HERMES_NODE_ARCHS:-arm64 x86_64}"
  if [[ -f "$out/.stamp" && "$(cat "$out/.stamp")" == "$stamp" ]]; then
    return
  fi
  log "building (first build takes a while: OpenSSL + hermes-node per architecture)"
  rm -rf "$out"
  ARCHS="${HERMES_NODE_ARCHS:-arm64 x86_64}" "$SRC/utils/build-apple-embed-lib.sh" "$out" "$ROOT/build" >&2
  echo "$stamp" > "$out/.stamp"
}

case "${1:-}" in
  fetch)
    fetch
    check_jsi
    echo "$SRC/hermes"
    ;;
  build)
    fetch
    check_jsi
    build
    echo "$ROOT/out"
    ;;
  *)
    echo "usage: $0 fetch|build" >&2
    exit 2
    ;;
esac
