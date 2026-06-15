#!/bin/bash
# Build the simulator-stream helper binary for macOS.
# Produces universal binary (arm64 + x86_64) at .build/release/SimulatorStream

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[simulator-stream] Building..."

# Build for the current architecture in release mode
swift build -c release 2>&1

# Copy binary to a predictable location
BUILD_DIR=".build/release"
if [ -f "$BUILD_DIR/SimulatorStream" ]; then
    echo "[simulator-stream] Build complete: $BUILD_DIR/SimulatorStream"
else
    echo "[simulator-stream] Error: Build output not found"
    exit 1
fi
