#!/usr/bin/env bash
set -euo pipefail

# Build the native helper binaries (anisette + zsign) for the HOST platform and
# place them in electron/bin/, so `yarn make` bundles a self-contained app that
# can re-sign IPAs with no extra setup for end users.
#
#   Run before packaging:   yarn build:helpers && yarn make
#
# Host build prerequisites:
#   Linux:  rustup + cargo-zigbuild (`pip install ziglang`); and `git`, `g++`,
#           `make`, `pkg-config`, `libssl-dev` for zsign.
#   macOS:  Xcode toolchain (anisette uses the Swift helper); `git` + clang for zsign.
#   Windows: build manually (see anisette/orbit-anisette-rs/README.md and
#           zsign build/windows/vs2022) — this script targets Linux/macOS.

here="$(cd "$(dirname "$0")" && pwd)"
electron_dir="$(cd "$here/.." && pwd)"
bin_dir="$electron_dir/bin"
cache_dir="$electron_dir/.cache" # already gitignored
mkdir -p "$bin_dir" "$cache_dir"

log() { printf '\033[0;36m▶ %s\033[0m\n' "$*"; }

# Resolve the linked `apple-resign` package (the anisette helper lives there).
# It's a dependency of apps/cli, so resolve from there; fall back to the sibling
# layout the `link:` target points at.
cli_dir="$(cd "$electron_dir/../../cli" && pwd)"
apple_resign="$(node -e "console.log(require('path').dirname(require.resolve('apple-resign/package.json', { paths: ['$cli_dir'] })))" 2>/dev/null || true)"
if [[ -z "${apple_resign:-}" || ! -d "$apple_resign" ]]; then
  apple_resign="$(cd "$electron_dir/../../../../apple-resign" 2>/dev/null && pwd || true)"
fi
if [[ -z "${apple_resign:-}" || ! -d "$apple_resign" ]]; then
  echo "Could not resolve the 'apple-resign' package — run 'yarn install' first." >&2
  exit 1
fi

os="$(uname -s)"
arch="$(uname -m)"
case "$arch" in aarch64 | arm64) arch_label="arm64" ;; *) arch_label="x64" ;; esac

# ----- anisette ---------------------------------------------------------------
case "$os" in
  Linux)
    log "Building anisette helper (linux-$arch_label)"
    (cd "$apple_resign" && yarn build:helper:rust "linux-$arch_label")
    cp "$apple_resign/bin/anisette-linux-$arch_label" "$bin_dir/"
    ;;
  Darwin)
    log "Building anisette Swift helper (macOS)"
    (cd "$apple_resign" && yarn build:helper:macos)
    cp "$apple_resign/bin/anisette" "$bin_dir/"
    ;;
  *)
    echo "Unsupported OS '$os' — build the helpers manually (see script header)." >&2
    exit 1
    ;;
esac

# ----- zsign ------------------------------------------------------------------
zsrc="$cache_dir/zsign"
if [[ -d "$zsrc/.git" ]]; then
  log "Updating zsign source"
  git -C "$zsrc" pull --ff-only || true
else
  log "Cloning zsign source"
  git clone --depth 1 https://github.com/zhlynn/zsign.git "$zsrc"
fi

case "$os" in
  Linux)
    log "Building zsign (linux)"
    make -C "$zsrc/build/linux"
    cp "$zsrc/bin/zsign" "$bin_dir/zsign-linux-$arch_label"
    chmod +x "$bin_dir/zsign-linux-$arch_label"
    ;;
  Darwin)
    log "Building zsign (macOS)"
    make -C "$zsrc/build/macos"
    cp "$zsrc/bin/zsign" "$bin_dir/zsign"
    chmod +x "$bin_dir/zsign"
    ;;
esac

log "Done — helpers in electron/bin:"
ls -la "$bin_dir"
