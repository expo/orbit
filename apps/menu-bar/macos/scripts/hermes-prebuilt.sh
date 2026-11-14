#!/bin/bash
# Downloads prebuilt Hermes (hermes-engine pod tarballs) and hermes-node (the
# CLI's embed library + hermesc) so a checkout doesn't have to compile them.
# The artifacts are produced by scripts/build-hermes-prebuilt.sh and published
# under a key that changes whenever anything they're built from changes.
#
#   hermes-prebuilt.sh key     print the key for this checkout
#   hermes-prebuilt.sh fetch   download + verify into vendor/prebuilt/<key>/;
#                              prints that directory, or nothing (exit 1) if
#                              the artifacts aren't published, in which case
#                              callers build from source
#
# ORBIT_HERMES_PREBUILT_URL: base URL; files are fetched from
#   <base>/<key>/<file>. Defaults to the GitHub release tagged
#   hermes-prebuilt-<key> (base .../releases/download/hermes-prebuilt-).
# HERMES_NODE_PREBUILT=0: never download; always build from source.
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../../../.." && pwd)
VENDOR="$SCRIPT_DIR/../vendor"
DEFAULT_URL=https://github.com/gabrieldonadel/hermes-node/releases/download/hermes-prebuilt-
FILES=(hermes-engine-macos-debug.tar.gz hermes-engine-macos-release.tar.gz hermes-node-embed-macos.tar.gz)

log() {
  echo "[hermes-prebuilt] $*" >&2
}

key() {
  # Everything the artifacts are built from: the pinned hermes-node (which
  # pins Hermes), the react-native-macos version and our patch to it (which
  # carries the vendored JSI), and the build scripts.
  {
    grep '^HERMES_NODE_REF=' "$SCRIPT_DIR/hermes-node.sh"
    node -p "require('react-native-macos/package.json').version" 2>/dev/null ||
      (cd "$REPO_ROOT" && node -p "require('react-native-macos/package.json').version")
    cat "$REPO_ROOT"/patches/react-native-macos+*.patch
    cat "$SCRIPT_DIR/build-hermes-prebuilt.sh"
  } | shasum -a 256 | cut -c1-16
}

fetch() {
  local k dir base
  k=$(key)
  dir="$VENDOR/prebuilt/$k"
  if [[ -f "$dir/.verified" ]]; then
    echo "$dir"
    return
  fi
  base="${ORBIT_HERMES_PREBUILT_URL:-$DEFAULT_URL}"
  mkdir -p "$dir"
  log "downloading prebuilt Hermes + hermes-node ($k)"
  if ! curl -fsSL "$base$k/SHA256SUMS" -o "$dir/SHA256SUMS"; then
    log "no prebuilt artifacts for $k at $base$k; building from source"
    rm -rf "$dir"
    return 1
  fi
  for f in "${FILES[@]}"; do
    curl -fsSL "$base$k/$f" -o "$dir/$f"
  done
  (cd "$dir" && shasum -a 256 -c SHA256SUMS >/dev/null) || {
    log "checksum mismatch for $k"
    rm -rf "$dir"
    exit 1
  }
  mkdir -p "$dir/hermes-node"
  tar -xzf "$dir/hermes-node-embed-macos.tar.gz" -C "$dir/hermes-node"
  touch "$dir/.verified"
  echo "$dir"
}

case "${1:-}" in
  key) key ;;
  fetch)
    if [[ "${HERMES_NODE_PREBUILT:-1}" == "0" ]]; then
      exit 1
    fi
    fetch
    ;;
  *)
    echo "usage: $0 key|fetch" >&2
    exit 2
    ;;
esac
