# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expo Orbit is a desktop menu bar application and CLI tool that accelerates mobile development workflows through one-click build launches and simulator/emulator management. It supports macOS, Windows, and Linux.

## Monorepo Structure

This is a Yarn/Lerna monorepo:

- **apps/cli** - Node.js CLI tool (expo-orbit-cli) using Commander.js
- **apps/menu-bar** - Main desktop app built with React Native + Electron
- **packages/common-types** - Shared TypeScript type definitions
- **packages/eas-shared** - Shared utilities for EAS, device management, app launching
- **packages/react-native-electron-modules** - Native Electron module bindings
- **packages/react-native-multi-window** - Multi-window management for Electron

## Build Commands

Root level commands (run from repo root):

```bash
yarn build        # Build all packages via Lerna
yarn lint         # Lint all packages
yarn watch        # Watch mode for all packages
yarn typecheck    # TypeScript type checking
```

### CLI App (apps/cli)

```bash
yarn build        # Compile TypeScript
yarn test         # Run Jest tests
yarn lint         # ESLint
yarn archive      # Bundle standalone executable with pkg
yarn gql          # Generate GraphQL types
```

### Menu Bar App (apps/menu-bar)

```bash
yarn start        # Start Metro bundler for development
yarn macos        # Build macOS app with Xcode
yarn test         # Run Jest tests (jest-expo preset)
yarn lint         # ESLint
yarn update-cli   # Copy compiled CLI into menu-bar app
yarn archive      # Build and archive for App Store
yarn notarize     # Notarize for macOS distribution
```

## Development Workflow

1. Start Metro bundler: `cd apps/menu-bar && yarn start`
2. Build macOS app: `yarn macos` (app appears in menu bar)
3. For CLI changes: `cd apps/cli && yarn build && cd ../menu-bar && yarn update-cli`

## Verifying on Devices (agent-device)

Use `agent-device` only on physical devices (iPhone, iPad, Android) to verify app installs and Orbit features. Do not drive the macOS menu bar app with it: its accessibility captures stall on Orbit's tree and the app stops answering Apple Events (`open -a` fails with -1712) while the runner is attached. Read the device's UI yourself — snapshot or screenshot — instead of asking the user what their screen shows, and treat a snapshot that names the expected screen as the verification (a bare launch exit code is not).

- `agent-device help workflow|physical-device|ios-system-ui` has the full reference; `help <command>` the exact flags.
- Physical iOS devices need the signed XCTest runner. Set `AGENT_DEVICE_IOS_TEAM_ID` (a team in Xcode's accounts) and `AGENT_DEVICE_IOS_BUNDLE_ID`, **plus a fresh `AGENT_DEVICE_STATE_DIR`**: the CLI talks to an already-running daemon, which keeps its own environment, so env set only on the CLI call is silently ignored (symptom: `No Account for Team`). Keep the same state dir for every call in that session.
- Orbit's own device commands go through `apps/cli` (`install-and-launch`, `launch-app`, `apple-id-auth --mode status`); use them for the action under test and `agent-device` to observe the result.
- Settings deep links on iOS 18+: `prefs:root=General&path=ManagedConfigurationList` opens VPN & Device Management; every `App-prefs:` form lands on the Apps list.
- Never run `apple-id-auth --mode sign-in|sign-out` against the user's real session store (`~/.orbit/apple-resign/secrets.json`) to test things: a sign-out clears the session the menu bar relies on and a sign-in replaces it, and the user then gets the "session expired" sign-in window. For such tests set `APPLE_RESIGN_EPHEMERAL=1` (ipa-resign swaps the file for a process-local store), or back the file up and restore it.

## Code Style

- Prettier: 100 char width, 2 spaces, single quotes, trailing comma es5
- Run `yarn lint --fix` before commits
- Commit message format: `[package-name] Description` (e.g., `[cli] Fix download retry logic`)

## Architecture Notes

- Menu bar app uses React Context providers for state (DevicesProvider, ThemeProvider)
- CLI commands are invoked by menu bar app for device/build operations
- GraphQL queries fetch EAS build data; local state manages device lists
- Native modules in `src/modules/` bridge to Electron APIs (MenuBar, Storage, Alert, FileHandler, Linking)
- Secondary windows (Settings, Onboarding) use react-native-multi-window
