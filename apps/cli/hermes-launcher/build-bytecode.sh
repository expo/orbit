#!/bin/bash
# Spike: bundle the CLI (apps/cli/build) into one CJS file and precompile it to
# Hermes bytecode for the orbit-cli launcher (written as <out>/orbit-cli.hbc).
#
# HERMESC must come from the same facebook/hermes commit as the
# hermesvm.framework the app ships (bytecode versions must match); hermes-node
# builds one at <build>/bin/hermesc. WRAP_CJS is hermes-node's
# tools/wrap-cjs.py.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=${1:?usage: $0 <out-dir>}
mkdir -p "$OUT"
npx -y esbuild@0.25 build/index.js --bundle --minify --platform=node --target=node18 \
  --format=cjs --external:macos-export-certificate-and-key --log-level=warning \
  --outfile="$OUT/orbit-cli.js"
python3 "$WRAP_CJS" "$OUT/orbit-cli.js" orbit-cli "$OUT/orbit-cli.wrapped.js"
"$HERMESC" -emit-binary -O -Xes6-block-scoping -Xasync-generators -Wno-undefined-variable \
  -out="$OUT/orbit-cli.hbc" "$OUT/orbit-cli.wrapped.js"
rm "$OUT/orbit-cli.js" "$OUT/orbit-cli.wrapped.js"
echo "Wrote $OUT/orbit-cli.hbc"
