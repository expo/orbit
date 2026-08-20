#!/bin/bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="${1:?An output directory is required}"
SDK_PATH="$(xcrun --sdk iphonesimulator --show-sdk-path)"
OUTPUT="$OUTPUT_DIR/OrbitSimulatorCamera.dylib"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

mkdir -p "$OUTPUT_DIR"
for ARCH in arm64 x86_64; do
  xcrun --sdk iphonesimulator clang \
    -arch "$ARCH" \
    -mios-simulator-version-min=15.0 \
    -fobjc-arc \
    -fmodules \
    -dynamiclib \
    -install_name @rpath/OrbitSimulatorCamera.dylib \
    -isysroot "$SDK_PATH" \
    -framework AVFoundation \
    -framework CoreImage \
    -framework CoreMedia \
    -framework CoreVideo \
    -framework Foundation \
    -framework QuartzCore \
    -framework UIKit \
    "$SOURCE_DIR/OrbitSimulatorCamera.m" \
    -o "$TEMP_DIR/OrbitSimulatorCamera-$ARCH.dylib"
done

lipo -create "$TEMP_DIR/OrbitSimulatorCamera-arm64.dylib" \
  "$TEMP_DIR/OrbitSimulatorCamera-x86_64.dylib" -output "$OUTPUT"

codesign --force --sign - "$OUTPUT"
