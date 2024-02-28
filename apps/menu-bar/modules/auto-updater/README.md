### Auto-updater Module

The auto-updater module is responsible for checking for updates and updating the application. On macOS it uses the Sparkle framework, and on Electron it uses a modified version of autoUpdater that supports Linux.

#### macOS

macOS updates are handled by the Sparkle framework. The appcast URL is set in the `Info.plist` file. The XML file with the updates information is located at the root of this repo and hosted GitHub.
For details on the XML file format, see the [Sparkle documentation](https://sparkle-project.org/documentation/publishing/).

#### Electron

Electron updates are handled by the `autoUpdater` module. The updates JSON URL is set inside `electron/main.ts` file.

The updates JSON file uses the following structure:

```
title: string;
link: string;
versions: {
  version: string;
  release_notes: string;
  pub_date: string;
  builds: {
    [platform: string]: {
      url: string;
      sha256?: string;
    };
  };
}[];
```

E.g.

```
{
  "title": "Orbit",
  "link": "https://raw.githubusercontent.com/expo/orbit/main/electron-updates.json",
  "versions": [
    {
      "version": "0.0.1",
      "pub_date": "2023-02-26",
      "release_notes": "<h3 id=\"-new-features\">\uD83C\uDF89 New features</h3> <ul> <li>Cache builds by default. (<a href=\"https://github.com/expo/orbit/pull/156\">#156</a> by <a href=\"https://github.com/gabrieldonadel\">@gabrieldonadel</a>)</li> <li>Improve fatal CLI error handling. (<a href=\"https://github.com/expo/orbit/pull/163\">#163</a>,<a href=\"https://github.com/expo/orbit/pull/166\">#166</a> by <a href=\"https://github.com/gabrieldonadel\">@gabrieldonadel</a>)</li> </ul> <h3 id=\"-bug-fixes\">\uD83D\uDC1B Bug fixes</h3> <ul> <li>Fixed listing devices on x64 machines. (<a href=\"https://github.com/expo/orbit/pull/164\">#164</a> by <a href=\"https://github.com/gabrieldonadel\">@gabrieldonadel</a>)</li> </ul> <h3 id=\"-others\">\uD83D\uDCA1 Others</h3> <ul> <li>Use Expo CLI instead of react-native community CLI. (<a href=\"https://github.com/expo/orbit/pull/155\">#155</a> by <a href=\"https://github.com/gabrieldonadel\">@gabrieldonadel</a>)</li> <li>Add basic telemetry. (<a href=\"https://github.com/expo/orbit/pull/168\">#168</a> by <a href=\"https://github.com/gabrieldonadel\">@gabrieldonadel</a>)</li> <li>Bump <code>snack-content@2.0.0</code> to preview 2. (<a href=\"https://github.com/expo/orbit/pull/167\">#167</a> by <a href=\"https://github.com/byCedric\">@byCedric</a>)</li></ul>",
      "builds": {
        "win32-x64": {
          "url": "https://github.com/expo/orbit/releases/download/expo-orbit-v1.0.4/"
        },
        "linux-x64": {
          "url": "https://github.com/expo/orbit/releases/download/expo-orbit-v1.0.4/expo-orbit-linux-x64.v1.0.4.AppImage",
          "sha256": "50e30322cdc83c0af182fff773920d6e093eff7d4c22bf19bca5cbdf762ab1fb"
        }
      }
    }
  ]
}
```

For windows builds it is important that the url points to the root of the release as the auto-updater will look for a RELEASES file at the distribution location and use that to determine whether to download the deltas or the latest full package (by calculating which one requires less total downloading) to update to the current version.
