#!/bin/bash
set -e
source "${REACT_NATIVE_PATH}/scripts/find-node-for-xcode.sh"
export PROJECT_ROOT="$PODS_ROOT/../../"
export CLI_PROJECT="$PROJECT_ROOT/../cli/"

cd $CLI_PROJECT
yarn archive

# Skip codesigning when xcodebuild was invoked with CODE_SIGNING_ALLOWED=NO
# (CI E2E builds — the runner has no Developer ID cert in its keychain).
if [ "${CODE_SIGNING_ALLOWED}" != "NO" ]; then
  yarn codesign
fi

cd $PROJECT_ROOT
yarn update-cli
