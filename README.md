# EAS Menu Bar

A quick way to access EAS builds and snack projects

## How to run locally

At the root of the repo run:

```bash
yarn
```

Then inside `apps/expo-menu-cli` run the following command to generate the standalone executable used by the `expo-menu-bar`:

```bash
yarn archive
```

Inside `apps/expo-menu-bar` run the following command to update the local cli file:

```bash
yarn update-cli
```

Finally, run the following command to start the app:

```bash
yarn macos
```
