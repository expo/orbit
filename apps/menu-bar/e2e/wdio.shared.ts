import type { Options } from '@wdio/types';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = path.resolve(__dirname, 'artifacts');

function sanitize(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, '_');
}

// Windows-only desktop screenshot via PowerShell. We need this because on
// Electron/Windows `browser.saveScreenshot` is unavailable when the WebDriver
// session never finished connecting — which is exactly the failure mode we
// most need to debug. PowerShell can grab the desktop without any permission
// gymnastics (no TCC equivalent on Windows for this).
function captureWindowsDesktop(outputPath: string): void {
  if (process.platform !== 'win32') {
    return;
  }
  const escaped = outputPath.replace(/\\/g, '\\\\').replace(/'/g, "''");
  const script = [
    'Add-Type -AssemblyName System.Drawing,System.Windows.Forms;',
    '$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;',
    '$bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height);',
    '$g = [System.Drawing.Graphics]::FromImage($bmp);',
    '$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size);',
    `$bmp.Save('${escaped}');`,
    '$g.Dispose(); $bmp.Dispose();',
  ].join(' ');
  const result = spawnSync('powershell', ['-NoProfile', '-Command', script], {
    encoding: 'utf-8',
  });
  if (result.status !== 0) {
    console.warn('[e2e] PowerShell desktop screenshot failed:', result.stderr);
  }
}

export const sharedConfig: Partial<Options.Testrunner> = {
  runner: 'local',
  tsConfigPath: './tsconfig.json',

  specs: ['./specs/**/*.e2e.ts'],
  exclude: [],

  maxInstances: 1,

  logLevel: 'warn',
  bail: 0,
  // 30s rather than the wdio default of 10s: on CI the `orbit-cli
  // list-devices` subprocess takes a few seconds to spawn and enumerate
  // AVDs/simulators, and the popover content returns null until that
  // finishes (DevicesProvider.hasInitialized). 10s was tight enough that
  // the first popover assertion flaked on Windows/Linux once we added the
  // AVD. Mocha's per-test timeout is still 60s so this leaves headroom.
  waitforTimeout: 30000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },

  onPrepare: () => {
    fs.rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    console.log(`[e2e] Artifacts dir: ${ARTIFACTS_DIR}`);
    // Snapshot the desktop right at the start so we have at least one file
    // in the artifacts dir even if every wdio session fails to connect.
    captureWindowsDesktop(path.join(ARTIFACTS_DIR, 'onPrepare.desktop.png'));
  },

  before: async () => {
    // Dump the accessibility tree for debugging. Remove once tests are stable.
    if (process.env.E2E_DEBUG) {
      // Wait a bit for the app to fully render
      await new Promise((r) => setTimeout(r, 3000));
      const source = await browser.getPageSource();
      console.log('[e2e] Accessibility tree:\n', source);
    }
  },

  afterTest: async (test, _context, { passed }) => {
    const base = path.join(
      ARTIFACTS_DIR,
      sanitize(`${test.parent}-${test.title}${passed ? '' : '-FAILED'}`)
    );
    try {
      // One screenshot per test (pass or fail). Mac2 captures the app's
      // frontmost window; Chromedriver captures the Electron renderer.
      // Goes through the WebDriver session, so no TCC / Screen Recording
      // permission is needed — `screencapture` would otherwise pop a system
      // prompt that blocks the runner's UI mid-test.
      await browser.saveScreenshot(`${base}.png`);
    } catch (err) {
      console.warn('[e2e] saveScreenshot failed:', (err as Error).message);
    }
    // On Windows, also capture the whole desktop. The Electron screenshot
    // above only contains the renderer; the desktop grab catches OS-level
    // dialogs (Defender SmartScreen, UAC, etc.) that may be blocking it.
    captureWindowsDesktop(`${base}.desktop.png`);
    if (!passed) {
      try {
        // Accessibility / DOM tree — invaluable for "why isn't this element
        // here" failures. On Mac2 this is an XML dump of the AX tree.
        const source = await browser.getPageSource();
        fs.writeFileSync(`${base}.source.xml`, source);
      } catch (err) {
        console.warn('[e2e] getPageSource failed:', (err as Error).message);
      }
    }
  },

  // Catches the "session never connected" case on Windows: afterTest doesn't
  // fire when Chromedriver couldn't reach the Electron renderer, so the
  // WebDriver-side hooks above produce nothing. PowerShell gives us at least
  // a desktop snapshot to see what was on screen when Chromedriver gave up.
  afterSession: () => {
    captureWindowsDesktop(path.join(ARTIFACTS_DIR, `afterSession-${Date.now()}.desktop.png`));
  },

  // Last-resort capture — fires once per run regardless of whether any
  // WebDriver session ever connected. `afterSession` only fires per-session
  // and only if a session actually terminated; `onComplete` always fires.
  onComplete: () => {
    captureWindowsDesktop(path.join(ARTIFACTS_DIR, 'onComplete.desktop.png'));
  },
};
