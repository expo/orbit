# Expo Orbit Menu bar

## Installation instructions

- Download the latest release from [menu-bar/releases](https://github.com/expo/eas-menu-bar/releases?q=expo-menu-bar)
- Unzip the file and drag Expo Orbit to the Applications folder.

## How to run locally

At the root of the repo run:

```bash
yarn
```

Then inside `apps/cli` run the following command to generate the standalone executable used by the `menu-bar`:

```bash
yarn archive
```

Inside `apps/menu-bar` run the following command to update the local cli file:

```bash
yarn update-cli
```

Finally, run the following command to start the app:

```bash
yarn macos
```
