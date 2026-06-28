# Publishing Expo Orbit to WinGet

This directory holds everything needed to distribute Orbit through the
[Windows Package Manager](https://learn.microsoft.com/windows/package-manager/)
so users can install and upgrade with:

```powershell
winget install Expo.Orbit
winget upgrade Expo.Orbit
```

WinGet doesn't host installers — it hosts **manifests** (YAML) in the community
repo [`microsoft/winget-pkgs`](https://github.com/microsoft/winget-pkgs) that
point at our existing GitHub Release `Setup.exe`. So there's no extra build
step; we just register each release.

## How it works

- **First version (manual, one-time):** WinGet's automation only updates
  packages that already exist, so the very first `Expo.Orbit` manifest must be
  submitted by hand (see below).
- **Every release after that (automatic):**
  [`.github/workflows/winget.yml`](../.github/workflows/winget.yml) runs when a
  GitHub Release is *published*, derives the version from the
  `expo-orbit-v<version>` tag, finds the `*Setup.exe` asset, and opens a PR to
  `winget-pkgs` via [`winget-releaser`](https://github.com/vedantmgoyal9/winget-releaser).

> Note: `build.yml` creates a **draft** release. The workflow triggers on the
> `released` event, which fires when that draft is published after review — so
> Orbit lands in WinGet only once a maintainer publishes the release.

## One-time setup

### 1. `WINGET_TOKEN` secret

`winget-releaser` pushes a branch to a fork of `winget-pkgs` and opens the PR
from it. Create the secret `WINGET_TOKEN` (repo or org level):

1. The account that owns the token must have a fork of
   `https://github.com/microsoft/winget-pkgs`.
2. Generate a **classic** PAT with the `public_repo` scope (fine-grained tokens
   are not supported by the action).
3. Add it under **Settings → Secrets and variables → Actions** as `WINGET_TOKEN`.

### 2. Bootstrap the first version

The manifests in [`manifests/`](./manifests) are a reference. Rather than
hand-editing the SHA256, generate the real manifest from the published asset
with [`wingetcreate`](https://github.com/microsoft/winget-create):

```powershell
winget install wingetcreate
wingetcreate new https://github.com/expo/orbit/releases/download/expo-orbit-v2.8.0/Expo.Orbit-2.8.0-x64.Setup.exe
# fill in the prompts (identifier Expo.Orbit, publisher Expo, etc.), then:
#   wingetcreate submit --token <PAT>
```

Use the metadata in `manifests/Expo.Orbit.locale.en-US.yaml` (publisher, tags,
description, license) when answering the prompts. Once Microsoft's reviewers
merge that first PR, the GitHub Action handles every subsequent release.

## Caveats

- **Code signing:** the Squirrel `Setup.exe` is currently unsigned. WinGet's
  community repo accepts unsigned installers, but users will see a SmartScreen
  warning, and validation may flag it. Signing the Windows build is recommended
  but not required to get listed.
- **Architecture:** only `x64` is published today. Add an `arm64` entry to the
  installer manifest / `installers-regex` if/when an arm64 build ships.
