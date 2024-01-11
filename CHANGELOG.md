# Changelog

## Unpublished

### 🛠 Breaking changes

### 🎉 New features

### 🐛 Bug fixes

### 💡 Others

- Install the expo package and set up autolinking for macOS. ([#130](https://github.com/expo/orbit/pull/130) by [@tsapeta](https://github.com/tsapeta))
- Remove AsyncStorage migrator and @react-native-async-storage/async-storage dependency. ([#135](https://github.com/expo/orbit/pull/135) by [@gabrieldonadel](https://github.com/gabrieldonadel))

## 1.0.2 — 2024-01-17

### 🎉 New features

- Improve Snack support for older SDKs. ([#117](https://github.com/expo/orbit/pull/117) by [@gabrieldonadel](https://github.com/gabrieldonadel))

### 🐛 Bug fixes

- Fix device selection logic when a simulator or device is no longer available. ([#114](https://github.com/expo/orbit/pull/114) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Fix projects section height when the user has less than three projects. ([#119](https://github.com/expo/orbit/pull/119) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Fix installing apps on Android real devices. ([#123](https://github.com/expo/orbit/pull/123) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Fix Settings window size when opening it from the context menu. ([#127](https://github.com/expo/orbit/pull/127) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Fix `osascript` error when launching apps on the Simulator. ([#139](https://github.com/expo/orbit/pull/139) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Improve popover height calculations when using multiple displays. ([#140](https://github.com/expo/orbit/pull/140) by [@gabrieldonadel](https://github.com/gabrieldonadel))

### 💡 Others

- Upgrade `@react-native-clipboard/clipboard` to 1.13.1 and remove patch. ([#116](https://github.com/expo/orbit/pull/116) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Configure EAS build workflow. ([#115](https://github.com/expo/orbit/pull/115) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Refresh the Settings window UI. ([#121](https://github.com/expo/orbit/pull/121) by [@simek](https://github.com/simek))
- Remove unused options from native main menu when the app is focused. ([#128](https://github.com/expo/orbit/pull/128) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Upgrade `react-native` to 0.73.1. ([#129](https://github.com/expo/orbit/pull/129) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Migrate Menubar to expo modules.([#133](https://github.com/expo/orbit/pull/133) by [@alanhughes](https://github.com/alanjhughes))

## 1.0.1 — 2023-12-01

### 🎉 New features

- Automatically open popover when the user tries to reopen the app from the Dock or Spotlight. ([#109](https://github.com/expo/orbit/pull/109) by [@gabrieldonadel](https://github.com/gabrieldonadel))

### 🐛 Bug fixes

- Fix installing EAS builds from cold start. ([#108](https://github.com/expo/orbit/pull/108) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Fix onboarding command check loading status. ([#110](https://github.com/expo/orbit/pull/110) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Fix undismissable Alerts. ([#112](https://github.com/expo/orbit/pull/112) by [@gabrieldonadel](https://github.com/gabrieldonadel))

## 1.0.0 — 2023-11-14

### 🎉 New features

- Add ability to show/hide different types of simulators, and add experimental TV support. ([#77](https://github.com/expo/orbit/pull/77) by [@douglowder](https://github.com/douglowder), [#84](https://github.com/expo/orbit/pull/84), [#90](https://github.com/expo/orbit/pull/90), [#91](https://github.com/expo/orbit/pull/91) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Add support for opening tarballs with multiple apps. ([#73](https://github.com/expo/orbit/pull/73), [#98](https://github.com/expo/orbit/pull/98) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Improve feedback to the user when an error occurs. ([#64](https://github.com/expo/orbit/pull/64), [#96](https://github.com/expo/orbit/pull/96) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Improve UI feedback when opening a snack project. ([#88](https://github.com/expo/orbit/pull/88) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Added drag and drop support for installing apps. ([#57](https://github.com/expo/orbit/pull/57) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Added support for installing apps directly from Finder. ([#56](https://github.com/expo/orbit/pull/56) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Added local HTTP server to circumvent deep-link limitations. ([#52](https://github.com/expo/orbit/pull/52), [#53](https://github.com/expo/orbit/pull/53), [#54](https://github.com/expo/orbit/pull/54), [#55](https://github.com/expo/orbit/pull/55) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Added Projects section to the menu bar. ([#46](https://github.com/expo/orbit/pull/46), [#59](https://github.com/expo/orbit/pull/59), [#83](https://github.com/expo/orbit/pull/83), [#95](https://github.com/expo/orbit/pull/95) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Added support for login to Expo. ([#41](https://github.com/expo/orbit/pull/41), [#43](https://github.com/expo/orbit/pull/43), [#44](https://github.com/expo/orbit/pull/44), [#45](https://github.com/expo/orbit/pull/45), [#62](https://github.com/expo/orbit/pull/62), [#67](https://github.com/expo/orbit/pull/67), [#89](https://github.com/expo/orbit/pull/89), [#100](https://github.com/expo/orbit/pull/100), [#101](https://github.com/expo/orbit/pull/101) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Focus simulator/emulator window when launching an app. ([#75](https://github.com/expo/orbit/pull/75) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Add support for running iOS internal distribution apps on real devices. ([#79](https://github.com/expo/orbit/pull/79) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Add support for opening snack projects on real iOS devices. ([#92](https://github.com/expo/orbit/pull/92) by [@gabrieldonadel](https://github.com/gabrieldonadel))

### 🐛 Bug fixes

- Fix some build and running issues. ([#69](https://github.com/expo/orbit/pull/69) by [@douglowder](https://github.com/douglowder))
- Fix build using Xcode 15. ([#74](https://github.com/expo/orbit/pull/74) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Fix listing iOS connected devices. ([#78](https://github.com/expo/orbit/pull/78) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Fix SystemIconView not reacting to Appearance changes. ([#85](https://github.com/expo/orbit/pull/85) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Fix useDeepLinking hook initial URL. ([#99](https://github.com/expo/orbit/pull/99) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Fix popover not closing when opening URLs. ([#102](https://github.com/expo/orbit/pull/102) by [@gabrieldonadel](https://github.com/gabrieldonadel))

### 💡 Others

- Add check for missing changelogs. ([#49](https://github.com/expo/orbit/pull/49) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Clean up eas-shared package. ([#60](https://github.com/expo/orbit/pull/60) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Unify device types across menu-bar, cli and eas-shared package. ([#66](https://github.com/expo/orbit/pull/66) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Upgrade react-native-svg to 13.14.0 and remove patch. ([#70](https://github.com/expo/orbit/pull/70) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Upgrade react-native to 0.72.5. ([#71](https://github.com/expo/orbit/pull/71) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Setup Lerna. ([#72](https://github.com/expo/orbit/pull/72) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Migrate AsyncStorage records to react-native-mmkv. ([#82](https://github.com/expo/orbit/pull/82) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Update Onboarding to rerun checks when focusing the window. ([#93](https://github.com/expo/orbit/pull/93) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Upgrade @react-native-clipboard/clipboard to 1.12.1 and patch warnings. ([#70](https://github.com/expo/orbit/pull/70) by [@gabrieldonadel](https://github.com/gabrieldonadel))

## 0.1.3 — 2023-09-21

### 🎉 New features

- Add auto update support. ([#65](https://github.com/expo/orbit/pull/65) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Improved performance when running `cli` commands. ([#61](https://github.com/expo/orbit/pull/61) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Show dock icon while windows are opened. ([#50](https://github.com/expo/orbit/pull/50) by [@gabrieldonadel](https://github.com/gabrieldonadel))

### 🐛 Bug fixes

- Fix SVGs on macOS Sonoma. ([#63](https://github.com/expo/orbit/pull/63) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Prevent the AutoLauncher process from running in the background after launching the main app. ([#51](https://github.com/expo/orbit/pull/51) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Fix WindowNavigator size calculations when showing an existing window. ([#48](https://github.com/expo/orbit/pull/48) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Remove additional spacing from Builds header. ([#40](https://github.com/expo/orbit/pull/40) by [@Simek](https://github.com/Simek))

## 0.1.2 — 2023-08-13

### 🎉 New features

- Added a context menu when right clicking on the menu bar icon. ([#36](https://github.com/expo/orbit/pull/36) by [@gabrieldonadel](https://github.com/gabrieldonadel))

### 🐛 Bug fixes

- Fixed listing devices on Intel machines. ([#39](https://github.com/expo/orbit/pull/39) by [@gabrieldonadel](https://github.com/gabrieldonadel))

### 💡 Others

- Refetch devices list after launching a simulator. ([#37](https://github.com/expo/orbit/pull/37) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Improve Popover height estimations. ([#38](https://github.com/expo/orbit/pull/38) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Add alert when trying to install build with no available device. ([#38](https://github.com/expo/orbit/pull/38) by [@gabrieldonadel](https://github.com/gabrieldonadel))

## 0.1.1 — 2023-08-10

### 🐛 Bug fixes

- Fixed listing devices when Android SDK path or `xcrun` is not configured correctly. ([#26](https://github.com/expo/orbit/pull/26) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Fixed menu bar popover height after putting Mac to sleep. ([#28](https://github.com/expo/orbit/pull/28) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Prevent multiple "Launch" clicks, add label when booting. ([#29](https://github.com/expo/orbit/pull/29) by [@Simek](https://github.com/Simek))
- Fixed Pre-flight checklist UI when a check fails. ([#33](https://github.com/expo/orbit/pull/33) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- Fixed Folder icon not rendering correctly inside the Settings Window. ([#34](https://github.com/expo/orbit/pull/34) by [@gabrieldonadel](https://github.com/gabrieldonadel))

### 💡 Others

- Move device running indicator inside the Popover to the right along with a green dot. ([#17](https://github.com/expo/orbit/pull/17) by [@Simek](https://github.com/Simek))

- Adjust Builds section spacing. ([#16](https://github.com/expo/orbit/pull/16) by [@Simek](https://github.com/Simek))

## 0.1.0 — 2023-08-10

_This version does not introduce any user-facing changes._
