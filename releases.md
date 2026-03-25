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

This triggers a CI workflow that builds Linux and Windows artifacts and creates a **draft** GitHub Release.

## 2. Archive and notarize the macOS app

On your local machine:

```bash
cd apps/menu-bar
yarn archive
yarn export-local-archive
yarn notarize
```

## 3. Publish the GitHub Release

1. Upload the notarized macOS zip to the draft GitHub Release
2. Review the release notes
3. Publish the release (mark as latest)

## 4. Update auto-update metadata

After the release is published:

```bash
yarn release:metadata
```

This updates `appcast.xml` and `electron-updates.json` with the new version entry, commits as `[appcast] Bump version to X.X.X`, and pushes.
