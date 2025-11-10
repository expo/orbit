# expo-orbit-cli

`expo-orbit-cli` is the internal command-line interface for Expo Orbit.
It provides commands to manage device emulators, download builds, launch apps/updates, and more.

---

## Installation

> **This CLI is shipped internally with Expo Orbit.**
> If you’re working locally, install dependencies and build the CLI:

```bash
yarn install
yarn build
```

Then invoke with:

```bash
yarn cli <command> [options]

# or, if you’ve set up an alias for the Orbit CLI so you can try it in projects all around your computer. Open your **.zshrc** or other config file and add:

```

alias expo-orbit-cli="/path/to/orbit/apps/cli/build/index.js"

```
expo-orbit-cli <command> [options]
```

---

## Commands

### download-build

```bash
expo-orbit-cli download-build <build-url>
```

- **Arguments**
  `<build-url>`
  : URL of the build to download.

- **Description**
  Downloads the specified build (e.g. an OTA bundle or app binary) to your machine.

---

### list-devices

```bash
expo-orbit-cli list-devices [--platform <platform>]
```

- **Options**
  `-p, --platform <string>`
  : Selected platform (`ios`, `android` or `all`).
  _Default_: `all`

- **Description**
  Lists available simulators/emulators and connected devices for the given platform.

---

### boot-device

```bash
expo-orbit-cli boot-device --platform <platform> --id <device-id> [--no-audio]
```

- **Options**
  `-p, --platform <string>`
  : Platform of the emulator (`ios` or `android`).
  `--id <string>`
  : UDID or name of the device to boot.
  `--no-audio`
  : (Android only) Launch the emulator with audio muted.

- **Description**
  Boots (or restarts) the specified simulator/emulator.

---

### install-and-launch

```bash
expo-orbit-cli install-and-launch --app-path <path> --device-id <device-id>
```

- **Options**
  `--app-path <string>`
  : Local filesystem path to the built app (`.app` or `.apk`).
  `--device-id <string>`
  : UDID or name of the target device/emulator.

- **Description**
  Installs the given app binary on the target device and immediately launches it.

---

### launch-expo-go

```bash
expo-orbit-cli launch-expo-go <snack-url> \
 --platform <platform> --device-id <device-id> [--sdk-version <version>]
```

- **Arguments**
  `<snack-url>`
  : URL of the Snack or project to open in Expo Go.

- **Options**
  `-p, --platform <string>`
  : Target platform (`ios` or `android`).
  `--device-id <string>`
  : UDID or name of the device/emulator.
  `--sdk-version <string>`
  : (Optional) Expo SDK version to use (e.g. `52.0.0`).

- **Description**
  Opens the given Snack URL in Expo Go on the specified device.

---

### launch-update

```bash
expo-orbit-cli launch-update <update-url> \
 --platform <platform> --device-id <device-id> [--skip-install] [--force-expo-go]
```

- **Arguments**
  `<update-url>`
  : URL of the published update (EAS Update).

- **Options**
  `-p, --platform <string>`
  : Target platform (`ios` or `android`).
  `--device-id <string>`
  : UDID or name of the device/emulator.
  `--skip-install`
  : Don’t reinstall the app; just apply the update.
  `--force-expo-go`
  : Always open the update via the Expo Go app (even if a standalone app is installed).

- **Description**
  Fetches and applies a published update on the device.

---

### check-tools

```bash
expo-orbit-cli check-tools [--platform <platform>]
```

- **Options**
  `-p, --platform <string>`
  : Platform to verify toolchain for (`ios` or `android`).

- **Description**
  Verifies that required native toolchains (Xcode command-line, Android SDKs/emulator tools) are installed.

---

### detect-apple-app-type

```bash
expo-orbit-cli detect-apple-app-type <app-path>
```

- **Arguments**
  `<app-path>`
  : Filesystem path to a built `.app` bundle.

- **Description**
  Inspects an iOS app bundle and reports whether it’s a simulator build, App Store build, etc.

---
