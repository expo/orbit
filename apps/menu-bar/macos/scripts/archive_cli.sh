#!/bin/bash
set -e
source "${REACT_NATIVE_PATH}/scripts/find-node-for-xcode.sh"
export PROJECT_ROOT="$PODS_ROOT/../../"
export CLI_PROJECT="$PROJECT_ROOT/../cli/"

cd $CLI_PROJECT
yarn archive
yarn codesign

cd $PROJECT_ROOT
yarn update-cli
