# **Creating a New Release for Expo Orbit**

Follow these steps to create a new release for Expo Orbit.

## **1. Update Version Information**

### Update App Versions

Modify the app version in the following files:

- `apps/menu-bar/electron/package.json`
- `apps/menu-bar/package.json`
- `apps/menu-bar/macos/ExpoMenuBar-macOS/Info.plist`

### Bump Build Version

Update the `CFBundleVersion` in the file:

- `apps/menu-bar/macos/ExpoMenuBar-macOS/Info.plist`

## **2. Update the Changelog**

- Add the latest changes to the **changelog file**.
- Commit the updated changelog to your branch.

## **3. Create and Push a Git Tag**

- Create a new tag using the following format:
  `expo-orbit-vX.X.X`

- Push the tag to the repository:
  ```bash
  git push origin expo-orbit-vX.X.X
  ```

This will trigger an automated workflow to generate assets for Linux and Windows.

## **4. Archive and Notarize the macOS App**

On your local machine:

1. Open the macOS project in **Xcode**.
2. Archive the app.
3. Notarize the archived app using your Apple Developer account.

## **5. Publish a GitHub Release**

- Create a new release on **GitHub**.
- Use the changelog as the release notes.
- Attach the generated assets (Linux, Windows, and notarized macOS builds).

## **6. Update Metadata**

### Update Appcast

- Edit and save updates to `appcast.xml`.

### Update Electron Updates

- Modify `electron-updates.json` with the new version details.

## **7. Update Homebrew Cask**

Run the following command to update the Homebrew cask version:

```bash
brew bump-cask-pr expo-orbit --version X.X.X
```
