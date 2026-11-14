#!/bin/bash
# Xcode "Select Hermes flavor" phase. With prebuilt Hermes, pod install vendors
# the Debug hermesvm.framework (with the debugger); Release builds swap in the
# Release one before anything links or embeds it. A no-op when Hermes is built
# from source (the hermes-engine pod then builds the right flavor itself).
set -euo pipefail
destroot="$PODS_ROOT/hermes-engine/destroot"
# A from-source pod has the Hermes sources (API/) next to its destroot.
[[ -d "$PODS_ROOT/hermes-engine/API" ]] && exit 0
prebuilt=$("$PODS_ROOT/../scripts/hermes-prebuilt.sh" fetch)

flavor=$([[ "$CONFIGURATION" == *Release* ]] && echo release || echo debug)
marker="$destroot/.flavor"
if [[ "$(cat "$marker" 2>/dev/null || true)" == "$flavor" ]]; then
  exit 0
fi
echo "Using the $flavor hermesvm.framework"
tmp=$(mktemp -d)
tar -xzf "$prebuilt/hermes-engine-macos-$flavor.tar.gz" -C "$tmp"
rsync -a --delete "$tmp/destroot/" "$destroot/"
echo "$flavor" > "$marker"
rm -rf "$tmp"
