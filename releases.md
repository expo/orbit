# Creating a New Release for Expo Orbit

## Prerequisites

- On the `main` branch with a clean working tree
- `CHANGELOG.md` has entries in the `## Unpublished` section
- `gh` CLI authenticated with GitHub

## 1. Run the release script

```bash
yarn release
```

This will:

- Prompt for the new version (e.g., `2.5.0` or `minor`)
- Bump versions in `apps/menu-bar/package.json`, `apps/menu-bar/electron/package.json`, and `Info.plist`
- Increment `CFBundleVersion` build number
- Stamp the `CHANGELOG.md` Unpublished section with the new version and date
- Commit, tag (`expo-orbit-vX.X.X`), and push

This triggers CI which:

- Builds Linux (DEB/RPM) and Windows (EXE) artifacts
- Builds and notarizes the macOS app via EAS Build
- Creates a **draft** GitHub Release with Linux/Windows artifacts

## 2. Publish the GitHub Release

1. Wait for the EAS Build to complete (check on [expo.dev](https://expo.dev))
2. Download the notarized macOS zip from EAS
3. Upload it to the draft GitHub Release
4. Review the release notes
5. Publish the release (mark as latest)

## 3. Update auto-update metadata

After the release is published:

```bash
yarn release:metadata
```

This updates `appcast.xml` and `electron-updates.json` with the new version entry, commits as `[appcast] Bump version to X.X.X`, and pushes.
