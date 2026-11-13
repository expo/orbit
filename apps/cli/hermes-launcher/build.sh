#!/bin/bash
# Builds the macOS CLI into apps/cli/dist/:
#
#   orbit-cli          native launcher (main.cpp) linking hermes-node and the
#                      app's hermesvm.framework (@rpath, Contents/Frameworks)
#   orbit-cli.hbc      the CLI (apps/cli/build) bundled with esbuild and
#                      precompiled to Hermes bytecode
#   bin/               ipa-resign's anisette and zsign helpers
#   node_modules/macos-export-certificate-and-key/
#                      the N-API addon, built for ARCHS and loaded without
#                      `bindings` (which can't find it next to a bundle)
#
# The menu bar ships this directory as Contents/Resources/cli/.
#
# Environment:
#   HERMES_NODE_OUT  output of macos/scripts/hermes-node.sh build (required)
#   HERMES_FW_DIR    directory containing the hermesvm.framework to link
#                    against; must be built from the same Hermes commit
#                    (required)
#   ARCHS            architectures (default: host)
#   MACOSX_DEPLOYMENT_TARGET (default: 14.0)
set -euo pipefail

CLI_DIR=$(cd "$(dirname "$0")/.." && pwd)
REPO_ROOT=$(cd "$CLI_DIR/../.." && pwd)
: "${HERMES_NODE_OUT:?set HERMES_NODE_OUT (macos/scripts/hermes-node.sh build)}"
: "${HERMES_FW_DIR:?set HERMES_FW_DIR to the directory containing hermesvm.framework}"
ARCHS=${ARCHS:-$(uname -m)}
DEPLOYMENT_TARGET=${MACOSX_DEPLOYMENT_TARGET:-14.0}
DIST="$CLI_DIR/dist"
WORK="$CLI_DIR/build-hermes"

arch_flags=()
for arch in $ARCHS; do
  arch_flags+=(-arch "$arch")
done

rm -rf "$DIST" "$WORK"
mkdir -p "$DIST/bin" "$WORK"

echo "[orbit-cli] compiling TypeScript"
(cd "$CLI_DIR" && yarn -s build)

echo "[orbit-cli] bundling and compiling to Hermes bytecode"
# macos-export-certificate-and-key stays external: it is a native addon, and
# ipa-resign requires it indirectly at runtime anyway.
(cd "$CLI_DIR" && npx -y esbuild@0.25.12 build/index.js --bundle --minify --platform=node \
  --target=node18 --format=cjs --external:macos-export-certificate-and-key \
  --log-level=warning --outfile="$WORK/orbit-cli.js")
python3 "$HERMES_NODE_OUT/bin/wrap-cjs.py" "$WORK/orbit-cli.js" orbit-cli "$WORK/orbit-cli.wrapped.js"
"$HERMES_NODE_OUT/bin/hermesc" -emit-binary -O -Xes6-block-scoping -Xasync-generators \
  -Wno-undefined-variable -out="$DIST/orbit-cli.hbc" "$WORK/orbit-cli.wrapped.js"

echo "[orbit-cli] building the launcher ($ARCHS)"
clang++ -std=c++20 -O2 "${arch_flags[@]}" -mmacosx-version-min="$DEPLOYMENT_TARGET" \
  "$CLI_DIR/hermes-launcher/main.cpp" \
  -I"$HERMES_NODE_OUT/include" \
  -F"$HERMES_FW_DIR" -framework hermesvm \
  "$HERMES_NODE_OUT/lib/libhermes-node-embed.a" \
  -lresolv -framework CoreFoundation -framework Security \
  -Wl,-rpath,@executable_path/../../Frameworks -Wl,-rpath,@executable_path/../Frameworks \
  -o "$DIST/orbit-cli"
strip -x "$DIST/orbit-cli"

echo "[orbit-cli] building macos-export-certificate-and-key ($ARCHS)"
ADDON_SRC=$(cd "$REPO_ROOT" && node -p "path.dirname(require.resolve('macos-export-certificate-and-key/package.json'))")
NAPI_INCLUDE=$(cd "$ADDON_SRC" && node -p "require('node-addon-api').include_dir")
ADDON_OUT="$DIST/node_modules/macos-export-certificate-and-key"
mkdir -p "$ADDON_OUT"
clang++ -std=c++17 -O2 "${arch_flags[@]}" -mmacosx-version-min="$DEPLOYMENT_TARGET" \
  -shared -undefined dynamic_lookup -fexceptions -DNAPI_CPP_EXCEPTIONS -DNAPI_VERSION=8 \
  -I"$HERMES_NODE_OUT/include" -I"$ADDON_SRC/$NAPI_INCLUDE" \
  "$ADDON_SRC/src/binding.cc" "$ADDON_SRC/src/certs.cc" \
  -framework CoreFoundation -framework Security \
  -o "$ADDON_OUT/macos_export_certificate_and_key.node"
strip -x "$ADDON_OUT/macos_export_certificate_and_key.node"
cp "$ADDON_SRC/package.json" "$ADDON_OUT/"
sed "s#require('bindings')('macos_export_certificate_and_key')#require('./macos_export_certificate_and_key.node')#" \
  "$ADDON_SRC/index.js" > "$ADDON_OUT/index.js"
grep -q "require('./macos_export_certificate_and_key.node')" "$ADDON_OUT/index.js"

echo "[orbit-cli] copying ipa-resign helpers"
IPA_RESIGN=$(cd "$REPO_ROOT" && node -p "path.dirname(require.resolve('ipa-resign/package.json'))")
cp "$IPA_RESIGN/bin/anisette" "$IPA_RESIGN/bin/zsign" "$DIST/bin/"

rm -rf "$WORK"
echo "[orbit-cli] wrote $DIST"
