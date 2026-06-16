<p align="center">
  <picture >
    <source height="96" media="(prefers-color-scheme: dark)" srcset="./.github/resources/banner-dark.png">
    <img height="96" alt="Expo Orbit" src="./.github/resources/banner-light.png">
  </picture>
  <h1 align="center">Expo Orbit</h1>
</p>

<p align="center">Accelerate your development workflow with one-click build launches and simulator management</p>

### Features highlights

* Install and launch apps from local files using file explorer or drag and drop a file into the app.
* Orbit supports any Android .apk, iOS Simulator compatible .app (on macOS), or ad hoc signed apps.
* Install and launch builds from [EAS](https://expo.dev/eas) to your simulators and real devices in one click.
* Install updates on simulators and real Android devices in one click.
* List and launch simulators, including running Android emulators without audio.
* Launch [Snack](https://snack.expo.dev/) projects in your simulators in one click.
* See pinned projects from your EAS dashboard and quickly launch your latest builds.

Try out Expo Orbit now, explore its capabilities, and share your feedback. Your input will shape the future of this tool and guide us on where to take it next.

## 🛠️ Installation

You can download the latest version of Orbit for macOS, Linux and Windows from [orbit/releases](https://github.com/expo/eas-menu-bar/releases) page.

### macOS

On macOS you can also install Orbit via Homebrew:

```sh
brew install expo-orbit
```

> [!note]
> If you want Orbit to automatically start when you log in, click on the Orbit icon in the menu bar or task bar, then select "Settings" and check the "Launch on Login" option.

## 📱 Installing apps on a physical iPhone

Orbit can install builds onto a physical iPhone connected over USB from macOS, Windows, and Linux. This installs an already-signed build (for example, an internal-distribution or development build from EAS) — **no paid Apple Developer account is required**, and the device just needs to be included in the build's provisioning profile (a free Apple account works).

To talk to the device over USB, Orbit relies on Apple's device service. If it isn't available yet, Orbit detects this and offers to install the required helper software for you:

| Platform | Helper software |
| --- | --- |
| macOS | Built in — nothing to install. |
| Windows | The [Apple Devices app](https://apps.microsoft.com/detail/9np83lwlpz9k) (or iTunes), which installs the Apple USB drivers and the Apple Mobile Device Service. |
| Linux | The open-source `usbmuxd` daemon (e.g. `sudo apt-get install usbmuxd`). |

Connect your iPhone, unlock it, and tap **Trust** when prompted. The device then appears under **iOS** in Orbit, ready to install to.

> [!note]
> On Linux, `usbmuxd` starts automatically when an Apple device is attached and stops shortly after it's unplugged, so you'll only see the device while it's connected. If a connected iPhone still isn't detected (and no Trust prompt appears), make sure the daemon is running with `sudo systemctl start usbmuxd`.

> [!note]
> On Windows and Linux, Orbit installs the app but cannot launch it automatically (that requires Xcode). After installing, open the app from your iPhone's Home Screen. On macOS the app is launched for you.

## 👏 Contributing

If you like Expo Orbit and want to help make it better then check out our [contributing guide](./CONTRIBUTING.md)!

## 📄 License

The Expo source code is made available under the [MIT license](LICENSE). Some of the dependencies are licensed differently, with the BSD license, for example.
