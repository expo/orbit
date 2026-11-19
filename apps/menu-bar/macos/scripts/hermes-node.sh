#!/bin/bash
# Fetches and builds hermes-node (https://github.com/gabrieldonadel/hermes-node),
# which the CLI runs on instead of a pkg-bundled Node.
#
# hermes-node pins the facebook/hermes commit (its `hermes` submodule) that
# the app's Hermes is built from too: without prebuilts, the Podfile points
# REACT_NATIVE_OVERRIDE_HERMES_DIR at that checkout and copies its JSI into
# react-native-macos (scripts/vendor-jsi.sh).
#
#   hermes-node.sh fetch   clone/update the pinned checkout; prints the Hermes
#                          source dir
#   hermes-node.sh build   also build the embed library, headers and hermesc
#                          (or download them prebuilt, see
#                          hermes-prebuilt.sh); prints the output dir
#
# HERMES_NODE_DIR: use an existing local checkout instead (for hermes-node
# development); it is built as-is.
# HERMES_NODE_ARCHS: architectures to build (default "arm64 x86_64"; always
# both, independent of Xcode's ARCHS, so Debug and Release share one build).
set -euo pipefail

HERMES_NODE_REPO=https://github.com/gabrieldonadel/hermes-node.git
HERMES_NODE_REF=1ede79dd89f6cf1c27d6f80d8d54d77e8b208feb
# sha256 of the SHA256SUMS file in hermes-node's prebuilt-<ref> release
# (scripts/hermes-prebuilt.sh). Pins the prebuilt binaries to this ref: release
# assets can be re-uploaded, so they're only used if this matches. Update it
# with the ref: curl -fsSL <release>/SHA256SUMS | shasum -a 256
HERMES_NODE_PREBUILT_SHA256=856d5af785c35589b5301c3cc2fbfb2b2589ca592cc5798e3e56a40fb5fc1865

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT="$SCRIPT_DIR/../vendor/hermes-node"

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
    echo "$SRC/hermes"
    ;;
  build)
    # Prefer the published prebuilt (scripts/hermes-prebuilt.sh) unless a
    # local hermes-node checkout is being developed.
    if [[ -z "${HERMES_NODE_DIR:-}" ]] && prebuilt=$("$SCRIPT_DIR/hermes-prebuilt.sh" fetch); then
      echo "$prebuilt/hermes-node"
      exit 0
    fi
    fetch
    build
    echo "$ROOT/out"
    ;;
  *)
    echo "usage: $0 fetch|build" >&2
    exit 2
    ;;
esac
