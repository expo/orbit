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

## Code Style

- Prettier: 100 char width, 2 spaces, single quotes, trailing comma es5
- Run `yarn lint --fix` before commits
- Commit message format: `[package-name] Description` (e.g., `[cli] Fix download retry logic`)

## Key Technologies

- React 19 with React Native 0.81.5
- Electron 28 for desktop shell
- TypeScript 5.8+
- Apollo Client 3 for GraphQL (EAS API)
- Fluent UI for Windows-style components
- Node.js 20+ required

## Architecture Notes

- Menu bar app uses React Context providers for state (DevicesProvider, ThemeProvider)
- CLI commands are invoked by menu bar app for device/build operations
- GraphQL queries fetch EAS build data; local state manages device lists
- Native modules in `src/modules/` bridge to Electron APIs (MenuBar, Storage, Alert, FileHandler, Linking)
- Secondary windows (Settings, Onboarding) use react-native-multi-window
