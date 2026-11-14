#!/bin/bash
# Xcode "Build CLI" phase: builds the CLI (apps/cli/hermes-launcher/build.sh)
# against this build's hermesvm.framework and copies it to apps/menu-bar/cli/,
# which the app bundles as Contents/Resources/cli/.
set -e
source "${REACT_NATIVE_PATH}/scripts/find-node-for-xcode.sh"
export PROJECT_ROOT="$PODS_ROOT/../../"
export CLI_PROJECT="$PROJECT_ROOT/../cli/"

# hermes-node and the Hermes it pins. Cached; the first build takes a while.
# Run outside Xcode's toolchain environment so its CMake builds see a normal
# macOS host (Xcode exports SDKROOT, ARCHS, *_DEPLOYMENT_TARGET, ...).
HERMES_NODE_OUT=$(env -i HOME="$HOME" PATH="/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin:$(dirname "$NODE_BINARY")" \
  "$PODS_ROOT/../scripts/hermes-node.sh" build)
export HERMES_NODE_OUT

# The hermes-engine pod builds hermesvm.framework from the same Hermes commit
# for this build's ARCHS before this target runs.
export HERMES_FW_DIR="$PODS_ROOT/hermes-engine/destroot/Library/Frameworks/macosx"

cd "$CLI_PROJECT"
yarn archive

# Skip codesigning when xcodebuild was invoked with CODE_SIGNING_ALLOWED=NO
# (CI E2E builds — the runner has no Developer ID cert in its keychain).
if [ "$CONFIGURATION" == "Release" ] && [ "${CODE_SIGNING_ALLOWED}" != "NO" ]; then
  yarn codesign
fi

cd "$PROJECT_ROOT"
yarn update-cli
