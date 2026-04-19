# Cross-Platform E2E Testing — Findings & Notes

## Architecture

Both macOS (native via react-native-macos) and Electron share the same React Native codebase in `apps/menu-bar/src/`. Tests use WebdriverIO with platform-specific drivers:

|                   | Electron                                  | macOS Native                                 |
| ----------------- | ----------------------------------------- | -------------------------------------------- |
| Driver            | `wdio-electron-service`                   | `appium-mac2-driver`                         |
| Element lookup    | CSS `[data-testid="..."]`                 | Accessibility ID `~...`                      |
| Window management | `getWindowHandles()` + `switchToWindow()` | Not supported — all windows in one tree      |
| App launch        | `appBinaryPath` in electron service       | `appium:bundleId` + optional `appium:prerun` |

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

On macOS native the storage path is `~/.expo/orbit/` (defined in `packages/common-types/src/storage.ts` via `StorageUtils.getExpoOrbitDirectory()`). The instance ID is `mmkv.default`.

On **Electron**, `Platform.OS === 'web'` in the renderer, so [`apps/menu-bar/src/modules/Storage.ts`](../src/modules/Storage.ts) passes `path: undefined` to `new MMKV()`, and `react-native-mmkv`'s web shim stores everything in `localStorage`. That ends up in the Electron userData directory (`~/Library/Application Support/<app-name>/Local Storage/leveldb/`), **not** `~/.expo/orbit/`.

Key values:

- `has-seen-onboarding` — boolean, controls whether onboarding shows on launch
- `user-preferences` — JSON string with user settings
- `sessionSecret` — auth token

### Pinning the Electron userData dir

Chromedriver defaults to a throwaway `--user-data-dir` per session, so without pinning, every `wdio run ./wdio.electron.ts` would start fresh (onboarding shows again, prefs lost, etc.). We pass an explicit `--user-data-dir=<tmpdir>/orbit-e2e-user-data` via `appArgs` in [`wdio.electron.ts`](wdio.electron.ts) so state persists between spec sessions. `reset-state.sh` wipes that dir before each `yarn test:electron` run.

### Resetting state for tests

Run `yarn reset-state` (or it runs automatically via `pretest:*` hooks) to clear `~/.expo/orbit/` and the pinned Electron userData dir so the app launches in a first-run state with onboarding visible.

## Platform Detection

### Use `automationName` to detect mac2

Neither `browserName` nor `platformName` are reliable for distinguishing Electron from macOS native:

- `browserName: 'electron'` → Chromedriver overrides it to `'chrome'` at runtime
- `platformName: 'mac'` → `wdio-electron-service` also sets this when running on macOS

The only reliable discriminator is `automationName`, which is `'Mac2'` for Appium mac2 and absent for Electron:

```typescript
// ✅ Reliable — only set in wdio.macos.ts, never present for Electron
const isNativeMac =
  (browser.capabilities as Record<string, unknown>)['appium:automationName'] === 'Mac2';

// ❌ Broken — Chromedriver reports 'chrome', not 'electron'
const isElectron = browser.capabilities.browserName === 'electron';

// ❌ Broken — wdio-electron-service sets 'mac' on macOS too
const isNativeMac = browser.capabilities.platformName === 'mac';
```

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

### Disable the CDP bridge if you don't use `browser.electron.*`

`wdio-electron-service` opens a Chrome DevTools Protocol bridge to the Electron main process on startup to support `browser.electron.execute`/`mock`. Waiting for `Runtime.executionContextCreated` with `auxData.isDefault` takes ~1–10s, retries up to 3×, and produces a spurious `Timeout exceeded to get the ContextId` error log even on success (the orphan `setTimeout` calls `log.error` regardless of whether the promise already resolved).

If the specs don't use `browser.electron.*` (ours don't), pass `useCdpBridge: false`:

```ts
services: [['electron', { useCdpBridge: false }]],
```

This falls back to the deprecated IPC-bridge. The service logs a deprecation warning, but startup is fast and the spurious `ContextId` log goes away.

### Stale renderer bundle trap

The packaged `.app` bundles the Expo web export from `apps/menu-bar/electron/dist/`, which is only regenerated when `yarn export-web` runs. The `generateAssets` hook in `forge.config.ts` fires this for both `make` and `package` — but historically it only fired for `make`, which meant `yarn package` would silently bundle a stale `dist/` and ship an old renderer into the `.app`.

**Symptom**: the popover's DOM only contains a subset of expected `testID`s even though they exist in the source.

**Diagnose**: grep the packaged bundle for the testid string:

```sh
grep -c "select-build-eas" \
  "apps/menu-bar/electron/out/Expo Orbit-darwin-arm64/Expo Orbit.app/Contents/Resources/app/.vite/build/renderer/dist/_expo/static/js/web/"*.js
```

If `0`, the renderer is stale. Re-run `yarn export-web` in `apps/menu-bar` and re-package.

### `--user-data-dir` rejected when launching the Electron binary directly

Running `"Expo Orbit.app/Contents/MacOS/expo-orbit" --user-data-dir=/tmp/x` from a shell prints `bad option: --user-data-dir=...` and exits — the ad-hoc-signed dev build's launcher stub rejects args when invoked directly. This is **not** a problem for the E2E setup: when Chromedriver launches Electron, it injects the flag via `goog:chromeOptions.args` and the Chromium layer accepts it normally. Don't waste time trying to reproduce E2E failures by invoking the binary manually — use `yarn test:electron`.
