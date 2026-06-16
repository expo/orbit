// E2E-only entry point for the wdio-electron-service IPC bridge.
//
// Why a separate file: Vite's tree-shaking can drop a whole module if no
// reachable code imports it, but it cannot reliably bundle a bare
// `require('wdio-electron-service/main')` inside a `process.env.WDIO_E2E`
// conditional in main.ts. Rollup/plugin-commonjs treats that as an external
// runtime require, so the call survives into the bundle and fails at startup
// because @electron-forge/plugin-vite doesn't ship `node_modules` into the
// packaged asar.
//
// By isolating the side-effect import in this file and importing the file
// itself behind the WDIO_E2E gate in main.ts, the entire module — including
// `wdio-electron-service` — becomes reachable in E2E builds (so Vite traces
// and inlines it) and unreachable in production builds (so Vite tree-shakes
// it out entirely).
import 'wdio-electron-service/main';
