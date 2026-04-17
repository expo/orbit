# Cross-Platform E2E Testing — Findings & Notes

## Architecture

Both macOS (native via react-native-macos) and Electron share the same React Native codebase in `apps/menu-bar/src/`. Tests use WebdriverIO with platform-specific drivers:

| | Electron | macOS Native |
|---|---|---|
| Driver | `wdio-electron-service` | `appium-mac2-driver` |
| Element lookup | CSS `[data-testid="..."]` | Accessibility ID `~...` |
| Window management | `getWindowHandles()` + `switchToWindow()` | Not supported — all windows in one tree |
| App launch | `appBinaryPath` in electron service | `appium:bundleId` + optional `appium:prerun` |

## macOS Accessibility Tree

### Only interactive elements are visible

On macOS, React Native's `testID` sets `accessibilityIdentifier` on the native `NSView`, but **only interactive elements** (Pressable, TouchableOpacity, Button) appear as accessibility elements in XCUITest's tree. Plain `<View testID="...">` elements are **not** queryable.

This means:
- ✅ `get-started-button` (Button/TouchableOpacity) — **works**
- ✅ `settings-button`, `quit-button` (Pressable via Item component) — **works**
- ✅ `select-build-eas`, `select-build-local` (Pressable via Item) — **works**
- ✅ `device-item` (Pressable) — **works**
- ❌ `onboarding-window` (plain View) — **not in tree**
- ❌ `popover-core`, `popover-footer`, `builds-section` (plain View) — **not in tree**
- ❌ `settings-window` (plain View) — **not in tree**

**Do not** add `accessible={true}` to wrapper Views to fix this — it makes the View an accessibility container that **hides all its children** from the tree.

### Dumping the tree for debugging

Run with `E2E_DEBUG=1` to dump the full accessibility tree at test start:

```sh
E2E_DEBUG=1 yarn test:macos
```

This outputs the XML source via `browser.getPageSource()` in the `before` hook (see `wdio.shared.ts`).

## macOS App Launch

### `appium:app` does not work on mac2

Unlike iOS, the `appium:app` capability does **not** launch the specified `.app` bundle on macOS. The mac2 driver only reliably launches apps via `appium:bundleId`.

### Launching a specific build

To test a specific `.app` build (not the installed one in `/Applications/`):

1. Use `appium:prerun` to open the `.app` via `open -a` before the session starts
2. Use `appium:bundleId` to connect to it

```typescript
{
  'appium:bundleId': 'dev.expo.orbit',
  'appium:prerun': { command: 'open', args: ['-a', '/absolute/path/to/Expo Orbit.app'] },
}
```

### Never set `appium:bundleId` and `appium:app` simultaneously

When both are present, the driver prefers the installed app matching that bundle ID and silently ignores `appium:app`.

### Path must be absolute

The mac2 driver resolves relative paths from WebDriverAgentRunner's sandboxed container (`~/Library/Containers/io.appium.WebDriverAgentRunner.xctrunner/...`), not from the test directory. Always use `path.resolve()`.

## macOS Window Management

### `getWindowHandles()` is not supported

The mac2 driver does not implement the WebDriver `/window/handles` endpoint — it's a browser-specific concept. On macOS, all app windows (popover, onboarding, settings) live in a single accessibility tree and are queryable directly without switching.

### Menu bar app behavior

Orbit is a menu bar app (`NSApp.setActivationPolicy(.accessory)` in Release). There's no dock icon or main window. The UI is:
- A status bar icon (XCUIElementTypeStatusItem)
- A popover attached to the status bar icon
- Secondary windows (Onboarding, Settings) as regular NSWindows

## State Management

### MMKV storage location

MMKV data is stored at `~/.expo/orbit/` (defined in `packages/common-types/src/storage.ts` via `StorageUtils.getExpoOrbitDirectory()`). The instance ID is `mmkv.default`.

Key values:
- `has-seen-onboarding` — boolean, controls whether onboarding shows on launch
- `user-preferences` — JSON string with user settings
- `sessionSecret` — auth token

### Resetting state for tests

Run `yarn reset-state` (or it runs automatically via `pretest:*` hooks) to clear `~/.expo/orbit/` so the app launches in a first-run state with onboarding visible.

## Electron-Specific Notes

### `browserVersion` is required

When the `e2e/` package doesn't have `electron` as a direct dependency, you must set `browserVersion` in the capability (e.g. `'33.2.0'`) so `wdio-electron-service` can fetch the matching Chromedriver.

### `expect` import

Always import `expect` from `@wdio/globals`, **not** from `expect-webdriverio` directly. Double-importing causes `Cannot redefine property: soft` because the global is registered twice.

```typescript
// ✅ Correct
import { browser, expect } from '@wdio/globals';

// ❌ Causes runtime error
import { expect } from 'expect-webdriverio';
```
