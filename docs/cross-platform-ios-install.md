# Cross-platform iOS device install — feasibility & design

Status: **research / not implemented**
Branch: `claude/cross-platform-app-install-fmSFG`
Scope: only physical iOS devices. iOS simulators stay macOS-only (they're a Mac
runtime). Android already works cross-platform via ADB.

---

## 1. What we have today

Two parallel paths, both anchored on macOS.

### 1a. `xcrun devicectl` (primary, iOS 17+)
- `packages/eas-shared/src/run/ios/devicectl.ts:281` shells out to
  `xcrun devicectl device install app ...`.
- `xcrun` lives inside Xcode CLT, so this path requires macOS + Xcode and is
  the canonical way to talk to a device running iOS 17 or newer.

### 1b. Custom USB protocol (legacy, pre-iOS 17)
- `packages/eas-shared/src/run/ios/appleDevice/AppleDevice.ts` — implements
  Usbmuxd + Lockdownd + MobileImageMounter + AFC + InstallationProxy directly
  in TypeScript. This is a port of the libimobiledevice protocol surface.
- Already attempts to be cross-platform at the socket layer:
  `client/UsbmuxdClient.ts:113-119`
  ```ts
  if (process.platform === 'win32') {
    return connect({ port: 27015, host: 'localhost' });   // assumes WSL2 / TCP usbmuxd
  } else {
    return connect({ path: '/var/run/usbmuxd' });          // macOS + Linux
  }
  ```
- Falls back to `xcrun devicectl` for launching on iOS 17+:
  `AppleDevice.ts:273-296` ("RemoteXPC ... not yet implemented").
- `installOnDeviceAsync.ts:42-48` swaps to devicectl only on
  `APPLE_DEVICE_USBMUXD` errors.

### Platform gating in callers
- `systemRequirements.ts:11-16` only blocks **simulators** for non-macOS — it
  does not gate device install.
- `apps/cli/src/commands/InstallAndLaunchApp.ts` routes purely on the
  artifact's target (`.app` for sim vs device), no `process.platform` checks.

So the CLI will *try* device install on Windows/Linux today. It will fail for
two concrete reasons listed below.

---

## 2. Concrete blockers for the legacy path on Windows / Linux

### 2.1 `usbmuxd` daemon is not bundled

The custom path needs a usbmuxd daemon to expose the iPhone USB endpoint as a
socket. On macOS the daemon ships with the OS. On Linux/Windows it does not.

| Platform | Today | What the user must install |
|---|---|---|
| macOS | `/var/run/usbmuxd` provided by the OS | nothing |
| Linux | code expects `/var/run/usbmuxd` | `usbmuxd` package (libimobiledevice project) — typically `apt install usbmuxd` / equivalent |
| Windows | code expects TCP `localhost:27015` | Apple's iTunes / Apple Mobile Device Support, **or** WSL2 with usbmuxd + a TCP bridge |

We currently don't surface this requirement anywhere — failures look like
opaque `ECONNREFUSED` / `ENOENT`. **Fix: detect and message clearly.**

### 2.2 DeveloperDiskImage is fetched from Xcode

`appleDevice/XcodeDeveloperDiskImagePrerequisite.ts:9` shells out to
`xcode-select -p` and then reads
`Xcode.app/.../iPhoneOS.platform/DeviceSupport/<ver>/DeveloperDiskImage.dmg`.

Nothing of that exists on Windows/Linux. The existing comment in
`AppleDevice.ts:201` flags it:

```ts
// verify DeveloperDiskImage exists (TODO: how does this work on Windows/Linux?)
// TODO: if windows/linux, download?
```

This is the single biggest blocker for the legacy path. Three options:

**Option A — Download DDIs from a community mirror.**
Communities like
[GitHub: filsv/iOSDeviceSupport](https://github.com/filsv/iOSDeviceSupport)
and `iOSDeviceSupport` mirrors host the same DMG + signature pairs Apple ships
inside Xcode. Pros: drops the Xcode dependency. Cons: trust/licensing — these
are Apple-owned binaries; we'd be redistributing or hot-linking. Also iOS 17+
moved to the "Personalized DDI" format (a `.dmg` + `.trustcache` + a
build-manifest signed per-device); the pre-17 mirror story does not cover the
new format.

**Option B — Skip the DDI mount entirely.**
The DDI is only required for services like `debugserver`, `accessibility`,
`instruments`, etc. The *install* itself (AFC upload + `InstallationProxy`)
does NOT need DDI. `mountDeveloperDiskImage` is called for both install and
post-install launch — splitting them lets install work without Xcode, at the
cost of losing automatic launch (`launchAppWithUsbmux` needs `debugserver`).

This is the cleanest minimal win: install works, app must be tapped manually.

**Option C — Require user-supplied DDI path via env var or setting.**
Cheapest but worst UX. Punts the problem to the user.

Recommended: **Option B as the default**, plus a settings/env hook (Option C)
for power users who want auto-launch.

---

## 3. iOS 26 — why we can't deliver it today

The legacy custom path *cannot* talk to iOS 17+, including iOS 26. The
protocol changed: developer services no longer ride classic
lockdown-over-usbmux. From iOS 17 onwards Apple moved to RemoteXPC over an
encrypted QUIC/TCP tunnel brokered by `tunneld`, with a separate pairing
protocol (RemotePairingProtocol). Reference:
[pymobiledevice3 RemoteXPC notes](https://github.com/doronz88/pymobiledevice3/blob/master/misc/RemoteXPC.md).

What that means concretely for the Orbit codebase:

- The `Usbmuxd → Lockdownd → InstallationProxy` chain in
  `appleDevice/client/*.ts` is, by itself, **insufficient for iOS 17+**. You
  can still enumerate the device and read basic values via lockdown, but
  installing an app requires reaching `com.apple.mobile.installation_proxy`
  through an RSD/tunneld session on iOS 17.0–17.3, and via the lockdown
  tunnel on iOS 17.4+. The latter is simpler and is what pymobiledevice3
  supports cross-platform today.
- iOS 26 inherits this stack. There's no indication Apple is reverting it.
  Community evidence (e.g. a public
  [iOS 26 gist using pymobiledevice3](https://gist.github.com/lucasrod/52b8375d0b8a8212092c2440f0400fa3))
  shows the same RemoteXPC pipeline still works.
- `libimobiledevice` ≥ 1.3 advertises iOS 17/18 support but the tunneld /
  RemoteXPC story on Linux and Windows is still rough — `ideviceinstaller`
  works for older OS versions, modern OS support is patchy.

Implementing RemoteXPC + tunneld in TypeScript inside Orbit is a multi-week
effort, requires kernel-level USB/TUN access on the host (admin on Windows,
sudo on Linux), and I cannot verify it without an iOS-26 device. Out of scope
for this branch.

If iOS 26 support on Windows/Linux becomes a priority, the realistic shape is:
1. Detect an existing `pymobiledevice3` installation (or bundle it as a sidecar binary built with `pyinstaller`).
2. Shell out to it for `mobiledevice install` / `process launch` on iOS ≥ 17.
3. Keep the native TS implementation for iOS ≤ 16 to avoid the Python dependency on the common path.

That's a different PR.

---

## 4. Proposed plan for this branch (pre-iOS 17 only)

Files touched would be limited to `packages/eas-shared/src/run/ios/`.

1. **`UsbmuxdClient.connectUsbmuxdSocket`** — wrap the `connect()` call with a
   typed error (`USBMUXD_UNAVAILABLE`) that carries a per-platform install
   hint:
   - macOS: "this should not happen, please file a bug"
   - Linux: "install `usbmuxd` (e.g. `sudo apt install usbmuxd`) and reconnect the device"
   - Windows: "install iTunes / Apple Mobile Device Support, or run usbmuxd via WSL2 with a TCP bridge on port 27015"

2. **`AppleDevice.runOnDevice`** — split the DDI mount out of the install
   path. Install (AFC upload + InstallationProxy) runs unconditionally;
   `mountDeveloperDiskImage` only runs when we need `debugserver` for
   `launchAppWithUsbmux`. On Windows/Linux, skip launch via debugserver and
   print "App installed — open it manually on the device."

3. **`XcodeDeveloperDiskImagePrerequisite`** — replace the
   `xcode-select`-based prerequisite with a strategy object:
   - macOS: existing behavior
   - Win/Linux: return `null` and let the caller short-circuit launch (item 2).
   No download from third-party mirrors in this branch — out of scope and a
   separate trust/licensing call.

4. **`installOnDeviceAsync`** — gate the existing devicectl fallback behind
   `process.platform === 'darwin'`. On Win/Linux, surface the underlying
   error directly instead of trying a tool that isn't installed.

5. **Version gate** — before calling `mountDeveloperDiskImage`, read
   `ProductVersion` via `LockdowndClient.getValue('ProductVersion')` and
   throw a clear `IOS_VERSION_UNSUPPORTED_ON_PLATFORM` error if the device is
   on iOS ≥ 17 and host is not macOS. Better than the current behavior
   (silent fallback into devicectl which doesn't exist).

### Out of scope
- Any code path supporting iOS 17+ on Windows/Linux.
- Bundling pymobiledevice3 or libimobiledevice binaries.
- Downloading DDIs from third-party mirrors.

### How this would be tested
- macOS: existing E2E flow unchanged (devicectl path still primary).
- Linux: manual — connect an iPhone running iOS 16.x, install Orbit, run
  `expo-orbit install`. Expected: clear usbmuxd hint if daemon missing;
  successful install if daemon present; "open manually" message after.
- Windows: manual — same as Linux, with iTunes / AMDS installed providing
  the TCP usbmuxd shim on `27015`.
- I cannot verify any of this from this session — no physical hardware.

---

## 5. Open questions for the team

1. Are we OK with **"install only, no auto-launch"** on Win/Linux for iOS ≤ 16?
   Auto-launch needs `debugserver` which needs DDI which needs Xcode.
2. Is iOS 17+/26 support on Win/Linux on the roadmap at all? If yes, what's
   the appetite for shipping a sidecar (pymobiledevice3 via pyinstaller adds
   ~30–50 MB to the bundle)?
3. Do we want to surface a *user-facing* OS support matrix in the UI so the
   menu-bar doesn't enable "Install on device" actions that we know can't
   succeed?

---

## Sources

- pymobiledevice3 — RemoteXPC protocol notes:
  https://github.com/doronz88/pymobiledevice3/blob/master/misc/RemoteXPC.md
- pymobiledevice3 — platform requirements (lockdown tunnel supported on all
  platforms starting iOS 17.4):
  https://deepwiki.com/doronz88/pymobiledevice3/1.2-installation-and-platform-requirements
- libimobiledevice project:
  https://libimobiledevice.org/
- ideviceinstaller:
  https://github.com/libimobiledevice/ideviceinstaller
- Community evidence of pymobiledevice3 working with iOS 26:
  https://gist.github.com/lucasrod/52b8375d0b8a8212092c2440f0400fa3
