#!/bin/bash
set -e

WORKSPACE_PATH='./macos/ExpoMenuBar.xcworkspace'
CONFIGURATION='Debug'
SCHEME='ExpoMenuBar-macOS'

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