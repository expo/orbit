#!/bin/bash
# Signs every Mach-O in apps/cli/dist (launcher, N-API addon, ipa-resign
# helpers) with the hardened runtime, for notarization.
#
# CODESIGN_IDENTITY overrides the Developer ID identity (e.g. "-" for ad hoc).
set -euo pipefail
CLI_DIR=$(cd "$(dirname "$0")/.." && pwd)
IDENTITY=${CODESIGN_IDENTITY:-"Developer ID Application: 650 Industries, Inc. (C8D8QTF339)"}

find "$CLI_DIR/dist" -type f | while read -r f; do
  if file -b "$f" | grep -q "Mach-O"; then
    codesign --options=runtime --timestamp --force --sign "$IDENTITY" \
      --entitlements "$CLI_DIR/macos/entitlements.plist" "$f"
  fi
done
