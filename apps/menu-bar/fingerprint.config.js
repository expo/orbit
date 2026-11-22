// Fingerprint of everything that goes into the compiled macOS app. CI caches the
// built .app under this hash and, when only JS changed, re-bundles the JS (and the
// CLI) into the cached app instead of running xcodebuild again.
// `npx @expo/fingerprint fingerprint:generate --platform ios` to inspect it locally.
/** @type {import('@expo/fingerprint').Config} */
module.exports = {
  extraSources: [
    // Out-of-tree platform: fingerprint doesn't know about `macos/` on its own.
    { type: 'dir', filePath: 'macos', reasons: ['macosNativeDir'] },
    { type: 'file', filePath: 'Gemfile.lock', reasons: ['macosNativeDir'] },
    // patch-package patches for native deps live at the monorepo root.
    { type: 'dir', filePath: '../../patches', reasons: ['patches'] },
  ],
  ignorePaths: [
    'macos/Pods/**',
    'macos/build/**',
    // Hermes / hermes-node downloads, pinned by scripts/hermes-node.sh.
    'macos/vendor/**',
    'macos/**/xcuserdata/**',
    'macos/.xcode.env.local',
    // Only patches JS into an already built app, doesn't affect the native build.
    'macos/scripts/ci/update-js.sh',
  ],
};
