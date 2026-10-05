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

import { app, BrowserWindow, WebContents, webContents } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';

// ---------------------------------------------------------------------------
// E2E-only main-process diagnostics.
//
// Appends window / renderer lifecycle events plus a 1s heartbeat (main loop
// alive, and each renderer still answers executeJavaScript) to a log file
// that e2e/wdio.shared.ts copies into the test artifacts after each session.
// Added to pin down the Linux CI hang right after "Get Started", where
// Chromedriver stops getting any answer from the popover renderer.
// ponytail: appendFileSync and string lines; this never ships to users.
// ---------------------------------------------------------------------------
const LOG_PATH = path.join(os.tmpdir(), 'orbit-e2e-main.log');
// Lets e2e/wdio.shared.ts find this process to dump its native stacks when
// a test fails (the main loop has been seen to block on Linux CI).
const PID_PATH = path.join(os.tmpdir(), 'orbit-e2e-main.pid');
const startedAt = Date.now();

function log(message: string) {
  const elapsed = String(Date.now() - startedAt).padStart(6);
  try {
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} +${elapsed}ms ${message}\n`);
  } catch {
    // Diagnostics must never break the app under test.
  }
}

function describeWindows() {
  return BrowserWindow.getAllWindows()
    .map((win) => {
      const flags = [
        win.isVisible() ? 'visible' : 'hidden',
        win.isFocused() ? 'focused' : '',
        win.isMinimized() ? 'minimized' : '',
      ].filter(Boolean);
      return `#${win.id}[${flags.join(',')}]`;
    })
    .join(' ');
}

function stringify(args: unknown[]) {
  return args
    .map((arg) => (arg && typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
    .join(' ');
}

function watchWindow(win: BrowserWindow) {
  const id = win.id;
  const events = [
    'show',
    'hide',
    'focus',
    'blur',
    'ready-to-show',
    'close',
    'closed',
    'unresponsive',
    'responsive',
    'minimize',
    'restore',
    'resize',
    'move',
  ];
  for (const name of events) {
    win.on(name as any, () => log(`window #${id} ${name}  windows: ${describeWindows()}`));
  }
}

function watchContents(contents: WebContents) {
  const id = contents.id;
  log(`webContents #${id} created type=${contents.getType()}`);
  const events = [
    'console-message',
    'render-process-gone',
    'unresponsive',
    'responsive',
    'destroyed',
    'did-finish-load',
    'did-start-navigation',
  ];
  for (const name of events) {
    contents.on(name as any, (_event: unknown, ...args: unknown[]) =>
      log(`webContents #${id} ${name} ${stringify(args)}`)
    );
  }
}

log(
  `wdio-hook loaded electron=${process.versions.electron} platform=${process.platform} ` +
    `windows: ${describeWindows()} gpu=${JSON.stringify(app.getGPUFeatureStatus())}`
);
try {
  fs.writeFileSync(PID_PATH, String(process.pid));
} catch {
  // see log()
}
// Electron's default handler shows a modal, synchronous error dialog for an
// uncaught main-process exception, which would freeze the event loop under
// test. Registering our own handler disables that dialog and records the
// error instead.
process.on('uncaughtException', (err) => log(`uncaughtException ${err?.stack ?? err}`));
process.on('unhandledRejection', (reason) =>
  log(`unhandledRejection ${(reason as Error)?.stack ?? String(reason)}`)
);
BrowserWindow.getAllWindows().forEach(watchWindow);
webContents.getAllWebContents().forEach(watchContents);
app.on('browser-window-created', (_event, win) => watchWindow(win));
app.on('web-contents-created', (_event, contents) => watchContents(contents));
app.on('child-process-gone', (_event, details) =>
  log(`child-process-gone ${stringify([details])}`)
);

setInterval(() => {
  log(`heartbeat windows: ${describeWindows()}`);
  for (const win of BrowserWindow.getAllWindows()) {
    const id = win.id;
    const sentAt = Date.now();
    win.webContents.executeJavaScript('document.visibilityState', true).then(
      (state) =>
        log(`window #${id} renderer answered in ${Date.now() - sentAt}ms visibility=${state}`),
      (err) => log(`window #${id} renderer executeJavaScript failed: ${err}`)
    );
  }
}, 1000);
