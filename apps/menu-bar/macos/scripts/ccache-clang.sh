#!/bin/sh
# ccache wrapper for Xcode's C/Objective-C compiler driver. Wired up only in CI
# via the Podfile when USE_CCACHE=1 (see post_install). Falls back to plain
# clang when ccache isn't installed so local builds never break.
if command -v ccache >/dev/null 2>&1; then
  exec ccache clang "$@"
fi
exec clang "$@"
