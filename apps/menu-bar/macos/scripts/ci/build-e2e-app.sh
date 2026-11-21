#!/bin/bash
# Builds the unsigned Release Expo Orbit.app used by the macOS E2E job into
# macos/build/Build/Products/Release. Production builds are signed/notarized via
# apps/menu-bar/.eas/build/build-release.yml; this one is tuned for CI speed:
#   - arm64 only: Release builds are universal by default, which compiles every
#     C/C++/ObjC/Swift file twice. The runner (and the E2E run) are arm64.
#   - No dSYM generation or index store, neither is used by E2E.
#   - ccache for C/C++/ObjC when installed (set CCACHE_DIR to where CI caches it).
#     Explicit Clang modules and precompiled prefix headers are disabled so ccache
#     can cache those compilations.
# Codesigning is skipped: the E2E job has no Developer ID Application cert, and
# Appium mac2 launches the .app by path in the same user session.
set -euo pipefail

MENU_BAR_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
REPO_ROOT="$(cd "$MENU_BAR_DIR/../.." && pwd)"
DERIVED_DATA_PATH="$MENU_BAR_DIR/macos/build"
cd "$MENU_BAR_DIR"

EXTRA_SETTINGS=()
if command -v ccache >/dev/null 2>&1; then
  # Generated (instead of checked in) so absolute paths to ccache and the active
  # toolchain's clang are baked in: Xcode doesn't run compiler tasks with the
  # shell's PATH or environment.
  WRAPPER_DIR="$DERIVED_DATA_PATH/ccache"
  mkdir -p "$WRAPPER_DIR"
  CCACHE_BIN="$(command -v ccache)"
  export CCACHE_CONFIGPATH="$WRAPPER_DIR/ccache.conf"
  cat > "$CCACHE_CONFIGPATH" <<EOF
cache_dir = ${CCACHE_DIR:-$HOME/Library/Caches/ccache}
max_size = ${CCACHE_MAXSIZE:-2G}
base_dir = $REPO_ROOT
sloppiness = clang_index_store,file_stat_matches,include_file_ctime,include_file_mtime,ivfsoverlay,pch_defines,modules,system_headers,time_macros
file_clone = true
depend_mode = true
inode_cache = true
EOF
  for compiler in clang clang++; do
    cat > "$WRAPPER_DIR/$compiler" <<EOF
#!/bin/sh
export CCACHE_CONFIGPATH="$CCACHE_CONFIGPATH"
exec "$CCACHE_BIN" "$(xcrun -f "$compiler")" "\$@"
EOF
    chmod +x "$WRAPPER_DIR/$compiler"
  done
  EXTRA_SETTINGS+=(
    CC="$WRAPPER_DIR/clang"
    CXX="$WRAPPER_DIR/clang++"
    LD="$WRAPPER_DIR/clang"
    LDPLUSPLUS="$WRAPPER_DIR/clang++"
    CLANG_ENABLE_EXPLICIT_MODULES=NO
    GCC_PRECOMPILE_PREFIX_HEADER=NO
  )
  "$CCACHE_BIN" --zero-stats >/dev/null
else
  echo "ccache not found, building without it"
fi

xcodebuild build \
  -workspace macos/ExpoMenuBar.xcworkspace \
  -scheme ExpoMenuBar-macOS \
  -configuration Release \
  -destination 'platform=macOS,arch=arm64' \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  -showBuildTimingSummary \
  ARCHS=arm64 \
  ONLY_ACTIVE_ARCH=YES \
  DEBUG_INFORMATION_FORMAT=dwarf \
  COMPILER_INDEX_STORE_ENABLE=NO \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  ${EXTRA_SETTINGS[@]+"${EXTRA_SETTINGS[@]}"}

if [ -n "${CCACHE_BIN:-}" ]; then
  "$CCACHE_BIN" --show-stats
fi

# Save the Hermes tools this build compiled JS with, so update-js.sh can rebuild
# the JS bundle and CLI of the cached app without Pods or a hermes-node download.
PODS_ROOT="$MENU_BAR_DIR/macos/Pods"
TOOLS_DIR="$DERIVED_DATA_PATH/e2e-tools"
rm -rf "$TOOLS_DIR"
mkdir -p "$TOOLS_DIR"
# The bundle phase's hermesc: HERMES_CLI_PATH from the hermes-engine pod's
# xcconfig, or react-native-xcode.sh's default when it doesn't set one.
HERMESC="$(sed -n 's/^HERMES_CLI_PATH = //p' \
  "$PODS_ROOT/Target Support Files/Pods-ExpoMenuBar-macOS/Pods-ExpoMenuBar-macOS.release.xcconfig")"
HERMESC="${HERMESC//\$(PODS_ROOT)/$PODS_ROOT}"
HERMESC="${HERMESC//\$\{PODS_ROOT\}/$PODS_ROOT}"
cp "${HERMESC:-$PODS_ROOT/hermes-engine/destroot/bin/hermesc}" "$TOOLS_DIR/hermesc"
# The hermes-node build the CLI was built with (ORBIT_HERMES_CLI builds), resolved
# the same way scripts/archive_cli.sh does.
if [ -f "$PODS_ROOT/.orbit-hermes-cli" ]; then
  HERMES_NODE_PREBUILT_DIR=
  HERMES_NODE_DIR=
  HERMES_NODE_PREBUILT=
  source "$PODS_ROOT/.orbit-hermes-cli"
  if [ -n "$HERMES_NODE_PREBUILT_DIR" ]; then
    HERMES_NODE_OUT="$HERMES_NODE_PREBUILT_DIR/hermes-node"
  else
    HERMES_NODE_OUT="$(HERMES_NODE_DIR="$HERMES_NODE_DIR" HERMES_NODE_PREBUILT="$HERMES_NODE_PREBUILT" \
      "$MENU_BAR_DIR/macos/scripts/hermes-node.sh" build)"
  fi
  cp -R "$HERMES_NODE_OUT" "$TOOLS_DIR/hermes-node"
  echo "arm64" > "$TOOLS_DIR/archs"
fi
echo "Saved E2E tools to $TOOLS_DIR:"
ls "$TOOLS_DIR"
