# Patches

`patch-package` applies these patches after each install. When you update a package, read its section here first: a patch that the new version does not need must go.

## react-native-macos

### `Libraries/Animated/shouldUseTurboAnimatedModule.js`

**Why:** without this patch, an `Animated` animation with `useNativeDriver: true` never runs in the macOS app. It shows no error: the view stays at its start value.

**Cause:** this function selects the native animation module. It returns `true` only for iOS, so on macOS the app uses the legacy `RCTNativeAnimatedModule`. That module needs the bridge to run its operations, and the New Architecture has no bridge. The patch adds `macos` to the check, so the app uses `RCTNativeAnimatedTurboModule`.

**Upstream:** [microsoft/react-native-macos#3079](https://github.com/microsoft/react-native-macos/issues/3079) (cause and this fix) and [#2661](https://github.com/microsoft/react-native-macos/issues/2661). Both were open on 2026-11-11.

**What depends on it:** the spinner of a device row, `Spinner` in `apps/menu-bar/src/components/DeviceItem.tsx`. It is the only animation in the app that uses the native driver.

**On an update of react-native-macos:**

1. Look at `shouldUseTurboAnimatedModule.js` in the new version. If the check includes `macos`, or the issue is closed with a fix, remove this part of the patch.
2. Start a device or a remote session and look at its row. The spinner must turn. If it does not turn, the native driver does not work.

### `React/CoreModules/RCTWebSocketModule.mm`

This part is older than this file. `git log -- patches/react-native-macos+0.83.0.patch` shows the change that added it.
