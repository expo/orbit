#!/bin/bash
# Builds the prebuilt artifacts the app and the CLI otherwise compile from
# source, so they can be published and downloaded (scripts/hermes-prebuilt.sh):
#
#   hermes-engine-macos-debug.tar.gz    hermesvm.framework (universal, with the
#   hermes-engine-macos-release.tar.gz  debugger in Debug), hermesc, headers;
#                                       the layout RN's hermes-engine podspec
#                                       takes via HERMES_ENGINE_TARBALL_PATH
#   hermes-node-embed-macos.tar.gz      hermes-node's embed library, headers,
#                                       hermesc and wrap-cjs.py
#                                       (scripts/hermes-node.sh build output)
#
# All three are built from the hermes-node commit pinned in
# scripts/hermes-node.sh (and the facebook/hermes commit it pins). The Hermes
# tarballs also carry that Hermes's JSI sources (jsi/), which pod install
# copies into react-native-macos (scripts/vendor-jsi.sh). The key that identifies them is
# printed by `scripts/hermes-prebuilt.sh key`.
#
# Usage: scripts/build-hermes-prebuilt.sh <out-dir>
set -euo pipefail

OUT=${1:?usage: $0 <out-dir>}
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../../../.." && pwd)
RN_PATH=$(cd "$REPO_ROOT" && node -p "path.dirname(require.resolve('react-native-macos/package.json'))")
mkdir -p "$OUT"
OUT=$(cd "$OUT" && pwd)

HERMES_SRC=$(HERMES_NODE_PREBUILT=0 "$SCRIPT_DIR/hermes-node.sh" fetch)
HERMES_NODE_OUT=$(HERMES_NODE_PREBUILT=0 "$SCRIPT_DIR/hermes-node.sh" build)

RELEASE_VERSION=$(sed -n 's/^HERMES_V1_VERSION_NAME=//p' "$RN_PATH/sdks/hermes-engine/version.properties")
# Matches hermes-node's build (and is below the app's minimum).
MAC_DEPLOYMENT_TARGET=13.0

# The cross builds need a host hermesc. RN's script would configure one
# without a build type, which this Hermes rejects, so build it here.
HOST_HERMESC="$OUT/.host-hermesc"
echo "[hermes-prebuilt] host hermesc"
env -i HOME="$HOME" PATH="$PATH" cmake -S "$HERMES_SRC" -B "$HOST_HERMESC" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release -DJSI_DIR="$HERMES_SRC/API/jsi" >/dev/null
env -i HOME="$HOME" PATH="$PATH" cmake --build "$HOST_HERMESC" --target hermesc >/dev/null

for flavor in Debug Release; do
  work=$(mktemp -d)
  echo "[hermes-prebuilt] hermes-engine $flavor"
  rsync -a --exclude .git "$HERMES_SRC/" "$work/hermes/"
  (
    cd "$work/hermes"
    # Configure with RN macOS's own settings (configure_apple_framework from
    # its build script), then build and lay out destroot/ the way its
    # build_apple_framework does, minus the legacy hermes/inspector headers
    # this Hermes no longer has.
    env -i HOME="$HOME" PATH="$PATH" \
      HERMES_PATH="$work/hermes" REACT_NATIVE_PATH="$RN_PATH" \
      JSI_PATH="$work/hermes/API/jsi" BUILD_TYPE="$flavor" \
      RELEASE_VERSION="$RELEASE_VERSION" \
      HERMES_OVERRIDE_HERMESC_PATH="$HOST_HERMESC/ImportHostCompilers.cmake" \
      bash -c '
        set -e
        . "$REACT_NATIVE_PATH/sdks/hermes-engine/utils/build-apple-framework.sh"
        configure_apple_framework macosx "x86_64;arm64" '"$MAC_DEPLOYMENT_TARGET"'
        cmake --build build_macosx --target hermesvm hermesc -j "$(sysctl -n hw.ncpu)"
      '
    mkdir -p destroot/Library/Frameworks/macosx destroot/bin \
      destroot/include/hermes/Public destroot/include/hermes/cdp destroot/include/jsi
    cp -R build_macosx/lib/hermesvm.framework destroot/Library/Frameworks/macosx/
    cp build_macosx/bin/hermesc destroot/bin/
    cp public/hermes/Public/*.h destroot/include/hermes/Public/
    cp API/hermes/*.h destroot/include/hermes/
    cp API/hermes/cdp/*.h destroot/include/hermes/cdp/
    cp API/jsi/jsi/*.h destroot/include/jsi/
    mkdir -p jsi && cp -R API/jsi/jsi/. jsi/
    lower=$(echo "$flavor" | tr '[:upper:]' '[:lower:]')
    # A second top-level entry keeps CocoaPods from flattening destroot/ away
    # when it extracts the tarball (it strips a lone root directory).
    tar -czf "$OUT/hermes-engine-macos-$lower.tar.gz" destroot LICENSE jsi
  )
  rm -rf "$work"
done

echo "[hermes-prebuilt] hermes-node embed"
tar -czf "$OUT/hermes-node-embed-macos.tar.gz" -C "$HERMES_NODE_OUT" .

rm -rf "$HOST_HERMESC"
"$SCRIPT_DIR/hermes-prebuilt.sh" key > "$OUT/KEY"
(cd "$OUT" && shasum -a 256 *.tar.gz > SHA256SUMS)
ls -la "$OUT"
