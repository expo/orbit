#!/bin/bash
# Refreshes the JS parts of an Expo Orbit.app built by build-e2e-app.sh: the
# Hermes bundle + Metro assets, and the bundled CLI (Contents/Resources/cli/).
# CI uses this when the native fingerprint matches a cached build, so JS-only
# changes skip xcodebuild.
#
# It reproduces what the "Bundle React Native code and images" and "Build CLI"
# build phases do, with the same hermesc / hermes-node build the cached app was
# built with (saved next to it by build-e2e-app.sh, see E2E_TOOLS_DIR).
#
# Usage: update-js.sh <path to Expo Orbit.app>
# Expects `yarn build` to have run at the repo root.
set -euo pipefail

APP_PATH="$(cd "$1" && pwd)"
RESOURCES="$APP_PATH/Contents/Resources"
MENU_BAR_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CLI_DIR="$(cd "$MENU_BAR_DIR/../cli" && pwd)"
TOOLS_DIR="${E2E_TOOLS_DIR:-$MENU_BAR_DIR/macos/build/e2e-tools}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

if [ ! -x "$TOOLS_DIR/hermesc" ]; then
  echo "error: $TOOLS_DIR/hermesc not found, it's saved by build-e2e-app.sh" >&2
  exit 1
fi
TOOLS_DIR="$(cd "$TOOLS_DIR" && pwd)"

cd "$MENU_BAR_DIR"
NODE_BINARY="$(command -v node)"
RN_MACOS_DIR="$("$NODE_BINARY" --print "require('path').dirname(require.resolve('react-native-macos/package.json'))")"

bundle_js() {
  # Mirrors the build phase's environment (see project.pbxproj), with DEST pointing
  # at a scratch dir so we know exactly which Resources entries Metro owns.
  CONFIGURATION=Release \
  PLATFORM_NAME=macosx \
  PROJECT_DIR="$MENU_BAR_DIR/macos" \
  PROJECT_ROOT="$MENU_BAR_DIR" \
  CONFIGURATION_BUILD_DIR="$WORK_DIR" \
  UNLOCALIZED_RESOURCES_FOLDER_PATH=Resources \
  NODE_BINARY="$NODE_BINARY" \
  HERMES_CLI_PATH="$TOOLS_DIR/hermesc" \
  ENTRY_FILE="$("$NODE_BINARY" -e "require('expo/scripts/resolveAppEntry')" "$MENU_BAR_DIR" ios absolute | tail -n 1)" \
  CLI_PATH="$("$NODE_BINARY" --print "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })")" \
  BUNDLE_COMMAND=export:embed \
    bash "$RN_MACOS_DIR/scripts/react-native-xcode.sh"
}

# Same as scripts/archive_cli.sh (unsigned), leaving the CLI in apps/cli/dist/.
archive_cli() {
  cd "$CLI_DIR"
  if [ -d "$TOOLS_DIR/hermes-node" ]; then
    # Links the launcher against the app's own (Release) hermesvm.framework.
    HERMES_NODE_OUT="$TOOLS_DIR/hermes-node" \
    HERMES_FW_DIR="$APP_PATH/Contents/Frameworks" \
    ARCHS="$(cat "$TOOLS_DIR/archs")" \
      yarn archive:hermes
  else
    rm -rf dist
    yarn archive
  fi
}

mkdir -p "$WORK_DIR/Resources"
bundle_js > "$WORK_DIR/bundle.log" 2>&1 &
BUNDLE_PID=$!
archive_cli > "$WORK_DIR/cli.log" 2>&1 &
CLI_PID=$!

STATUS=0
wait $BUNDLE_PID || STATUS=$?
echo "::group::Bundle JS" && cat "$WORK_DIR/bundle.log" && echo "::endgroup::"
wait $CLI_PID || STATUS=$?
echo "::group::Build CLI" && cat "$WORK_DIR/cli.log" && echo "::endgroup::"
if [ $STATUS -ne 0 ]; then
  echo "error: updating JS failed" >&2
  exit $STATUS
fi

# Replace every top-level entry Metro produced (main.jsbundle, assets/...) so
# assets removed from the source don't linger in the cached app.
for entry in "$WORK_DIR/Resources/"*; do
  name="$(basename "$entry")"
  rm -rf "${RESOURCES:?}/$name"
  cp -R "$entry" "$RESOURCES/$name"
  echo "Updated Resources/$name"
done

rm -rf "${RESOURCES:?}/cli"
cp -R "$CLI_DIR/dist" "$RESOURCES/cli"
echo "Updated Resources/cli"
