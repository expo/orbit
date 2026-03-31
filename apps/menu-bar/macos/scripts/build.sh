#!/bin/bash
set -e

WORKSPACE_PATH='./macos/ExpoMenuBar.xcworkspace'
CONFIGURATION='Debug'
SCHEME='ExpoMenuBar-macOS'

# Build the native simulator-stream helper
echo "[build] Building simulator-stream helper..."
if [ -f "./helpers/simulator-stream/build.sh" ]; then
  bash ./helpers/simulator-stream/build.sh || echo "[build] simulator-stream build failed (non-fatal, will use xcrun fallback)"
fi

# Build
xcodebuild -workspace "$WORKSPACE_PATH" -scheme "$SCHEME" -configuration "$CONFIGURATION"

# Get build settings
BUILD_SETTINGS_JSON=$(xcodebuild -showBuildSettings -workspace "$WORKSPACE_PATH" -scheme "$SCHEME" -configuration "$CONFIGURATION" -json)

readBuildSetting() {
  echo "$BUILD_SETTINGS_JSON" | jq -r --arg key "$1" '.[0] | .buildSettings | .[$key]'
}

BUILT_PRODUCTS_DIR=$(readBuildSetting "BUILT_PRODUCTS_DIR")
FULL_PRODUCT_NAME=$(readBuildSetting "FULL_PRODUCT_NAME")

open -a "$BUILT_PRODUCTS_DIR/$FULL_PRODUCT_NAME" &