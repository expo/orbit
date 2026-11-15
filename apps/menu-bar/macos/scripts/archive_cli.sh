#!/bin/bash
# Xcode "Build CLI" phase: builds the CLI and copies it to apps/menu-bar/cli/,
# which the app bundles as Contents/Resources/cli/.
#
# By default (and as before) Release builds bundle the pkg binaries. Builds
# where pod install ran with ORBIT_HERMES_CLI=1 instead build the orbit-cli
# launcher + orbit-cli.hbc (apps/cli/hermes-launcher/build.sh) against this
# build's hermesvm.framework, in every configuration.
set -e
source "${REACT_NATIVE_PATH}/scripts/find-node-for-xcode.sh"
export PROJECT_ROOT="$PODS_ROOT/../../"
export CLI_PROJECT="$PROJECT_ROOT/../cli/"

# Skip codesigning when xcodebuild was invoked with CODE_SIGNING_ALLOWED=NO
# (CI E2E builds — the runner has no Developer ID cert in its keychain).
sign=false
if [ "$CONFIGURATION" == "Release" ] && [ "${CODE_SIGNING_ALLOWED}" != "NO" ]; then
  sign=true
fi

if [ -f "$PODS_ROOT/.orbit-hermes-cli" ]; then
  # hermes-node and the Hermes it pins (prebuilt, or built once and cached).
  # Run outside Xcode's toolchain environment so a source build's CMake sees a
  # normal macOS host (Xcode exports SDKROOT, ARCHS, *_DEPLOYMENT_TARGET, ...).
  HERMES_NODE_OUT=$(env -i HOME="$HOME" PATH="/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin:$(dirname "$NODE_BINARY")" \
    "$PODS_ROOT/../scripts/hermes-node.sh" build)
  export HERMES_NODE_OUT
  # The hermes-engine pod's hermesvm.framework, for this build's ARCHS.
  export HERMES_FW_DIR="$PODS_ROOT/hermes-engine/destroot/Library/Frameworks/macosx"

  cd "$CLI_PROJECT"
  yarn archive:hermes
  if [ "$sign" == true ]; then
    yarn codesign:hermes
  fi
elif [ "$CONFIGURATION" == "Release" ]; then
  cd "$CLI_PROJECT"
  # Start clean: a previous ORBIT_HERMES_CLI build leaves the launcher in dist/,
  # and the app prefers it when present.
  rm -rf dist
  yarn archive
  if [ "$sign" == true ]; then
    yarn codesign
  fi
else
  echo "Skipping archiving CLI"
  exit 0
fi

cd "$PROJECT_ROOT"
yarn update-cli
