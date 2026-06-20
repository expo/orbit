#!/usr/bin/env bash
# Build orbit-cli with the apple-resign native helpers embedded, and
# optionally drop the new binaries into the installed Orbit app for local
# testing.
#
# Steps:
#   1. (Re)build apple-resign TS bundle.
#   2. Build the macOS Swift anisette helper (bin/anisette).
#   3. If zsign is missing from apple-resign/bin/, copy it from PATH (brew
#      install). Skipped if zsign isn't installed — the runtime falls back to
#      /opt/homebrew/bin/zsign on macOS.
#   4. Refresh orbit's node_modules/apple-resign copy (yarn's file: dep is
#      a one-shot copy at install time, not a symlink).
#   5. yarn archive in apps/cli — produces dist/orbit-cli-{arm64,x64} with
#      the helpers embedded in pkg's snapshot FS.
#   6. If --install is passed, copy the new binaries into
#      /Applications/Expo Orbit.app/Contents/Resources/.
#
# Usage:
#   ./scripts/build-with-helpers.sh           # build only
#   ./scripts/build-with-helpers.sh --install # build + drop into installed app
#   ./scripts/build-with-helpers.sh --skip-swift   # skip Swift rebuild (faster
#                                                 # iterating on TS-only changes)

set -euo pipefail

cli_dir="$(cd "$(dirname "$0")/.." && pwd)"
orbit_root="$(cd "$cli_dir/../.." && pwd)"
apple_resign_dir="$(cd "$orbit_root/../apple-resign" 2>/dev/null && pwd || true)"

if [[ -z "$apple_resign_dir" || ! -d "$apple_resign_dir" ]]; then
  echo "✗ Could not find apple-resign as a sibling of orbit at $orbit_root/../apple-resign" >&2
  exit 1
fi

install_to_app=0
skip_swift=0
for arg in "$@"; do
  case "$arg" in
    --install)    install_to_app=1 ;;
    --skip-swift) skip_swift=1 ;;
    *) echo "Unknown flag: $arg" >&2; exit 2 ;;
  esac
done

green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
red() { printf '\033[0;31m%s\033[0m\n' "$*"; }

# --- 1 + 2: build apple-resign + Swift helper -------------------------------
green "▶ apple-resign — build TS"
(cd "$apple_resign_dir" && yarn build)

if [[ $skip_swift -eq 0 ]]; then
  green "▶ apple-resign — build Swift anisette helper"
  (cd "$apple_resign_dir" && yarn build:helper:macos)
else
  yellow "▶ skipping Swift rebuild (--skip-swift)"
fi

# --- 3: stage zsign into apple-resign/bin/ ---------------------------------
zsign_target="$apple_resign_dir/bin/zsign"
if [[ ! -f "$zsign_target" ]]; then
  if zsign_src="$(command -v zsign 2>/dev/null)"; then
    green "▶ copying zsign from $zsign_src → $zsign_target"
    cp "$zsign_src" "$zsign_target"
    chmod +x "$zsign_target"
  else
    yellow "▶ zsign not in PATH; pkg snapshot won't include it. Runtime will look in /opt/homebrew/bin/zsign."
  fi
else
  green "▶ zsign already at $zsign_target"
fi

# --- 4: ensure node_modules/apple-resign symlink is in place ---------------
# package.json uses `link:` so node_modules/apple-resign is a symlink straight
# to source. Idempotent yarn install just re-establishes the link if missing.
if [[ ! -L "$orbit_root/node_modules/apple-resign" ]]; then
  green "▶ re-establishing node_modules/apple-resign symlink"
  (cd "$orbit_root" && yarn install)
else
  green "▶ node_modules/apple-resign → $(readlink "$orbit_root/node_modules/apple-resign")"
fi

# --- 5: build orbit-cli (pkg) ----------------------------------------------
green "▶ apps/cli — yarn archive"
(cd "$cli_dir" && yarn archive)

# Sanity-check the snapshot actually contains the helpers. pkg compresses the
# snapshot, so `strings` can't see through it — scan raw bytes with `grep -a`.
embedded_anisette=$(grep -ac "bin/anisette" "$cli_dir/dist/orbit-cli-arm64" || true)
embedded_zsign=$(grep -ac "bin/zsign" "$cli_dir/dist/orbit-cli-arm64" || true)
green "▶ embedded refs: anisette=$embedded_anisette zsign=$embedded_zsign"
if [[ $embedded_anisette -eq 0 ]]; then
  red "  WARNING: no `anisette` references found in the pkg snapshot — sign-in will fail."
fi
if [[ $embedded_zsign -eq 0 ]]; then
  yellow "  note: no `zsign` references found; runtime will fall back to /opt/homebrew/bin/zsign on macOS."
fi

# --- 6: optionally install into the running app ----------------------------
if [[ $install_to_app -eq 1 ]]; then
  app_resources="/Applications/Expo Orbit.app/Contents/Resources"
  if [[ ! -d "$app_resources" ]]; then
    red "✗ /Applications/Expo Orbit.app not found — skipping install step."
    exit 0
  fi
  green "▶ installing orbit-cli into $app_resources"
  cp "$cli_dir/dist/orbit-cli-arm64" "$app_resources/orbit-cli-arm64"
  cp "$cli_dir/dist/orbit-cli-x64"   "$app_resources/orbit-cli-x64"
  yellow "▶ tip: relaunch Orbit (cmd-Q the menu-bar icon, reopen the app) before testing."
fi

green "✓ done"
