#!/bin/bash
# Downloads the prebuilt Hermes (hermes-engine pod tarballs + the JSI they were
# built with) and hermes-node embed library for the hermes-node commit pinned
# in scripts/hermes-node.sh, so a checkout doesn't have to compile them.
# hermes-node publishes them for each commit as the release prebuilt-<commit>
# (its utils/build-apple-prebuilt.sh and Apple prebuilt workflow).
#
#   hermes-prebuilt.sh key     print the pinned hermes-node commit
#   hermes-prebuilt.sh fetch   download + verify into vendor/prebuilt/<commit>/;
#                              prints that directory, or nothing (exit 1) if
#                              that commit has no release, in which case
#                              callers build from source
#
# ORBIT_HERMES_PREBUILT_URL: base URL; files are fetched from
#   <base><commit>/<file>. Defaults to hermes-node's GitHub releases.
# HERMES_NODE_PREBUILT=0: never download; always build from source.
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
VENDOR="$SCRIPT_DIR/../vendor"
DEFAULT_URL=https://github.com/gabrieldonadel/hermes-node/releases/download/prebuilt-
FILES=(hermes-engine-macos-debug.tar.gz hermes-engine-macos-release.tar.gz hermes-node-embed-macos.tar.gz)

log() {
  echo "[hermes-prebuilt] $*" >&2
}

key() {
  sed -n 's/^HERMES_NODE_REF=//p' "$SCRIPT_DIR/hermes-node.sh"
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
  # The JSI this Hermes was built with, for scripts/vendor-jsi.sh.
  tar -xzf "$dir/hermes-engine-macos-debug.tar.gz" -C "$dir" jsi
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
