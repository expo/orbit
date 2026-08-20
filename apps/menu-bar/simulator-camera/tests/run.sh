#!/bin/bash
set -euo pipefail

TESTS_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="$(mktemp -t orbit-simulator-camera-protocol)"
trap 'rm -f "$OUTPUT"' EXIT

clang -std=c11 -Wall -Wextra -Werror "$TESTS_DIR/protocol_test.c" -o "$OUTPUT"
"$OUTPUT"
