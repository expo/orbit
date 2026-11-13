// Spike: exercise Node APIs from the menu bar's JS through hermes-node, which
// the native side attaches to this runtime as `globalThis.__nodeRequire`.
// See macos/ExpoMenuBar-macOS/HermesNodeSpike.mm.

declare const __nodeRequire: ((id: string) => any) | undefined;

const CLI_ENTRY = `${__dirname_hint()}/../../cli/build/index.js`;

function __dirname_hint() {
  // Metro bundles have no __dirname; the spike runs against the local checkout.
  return '/Users/briones/.config/tuft/sessions/1794601900.090569/worktrees/orbit/apps/menu-bar/src';
}

function log(...args: unknown[]) {
  console.log('[hermes-node]', ...args);
}

function step(name: string, fn: () => void) {
  try {
    fn();
  } catch (e: any) {
    log('FAILED', name, e?.stack ?? e);
  }
}

export function runHermesNodeSpike() {
  if (typeof __nodeRequire !== 'function') {
    log('not attached');
    return;
  }
  const t0 = Date.now();
  const fs = __nodeRequire('fs');
  const os = __nodeRequire('os');
  const path = __nodeRequire('path');
  const cp = __nodeRequire('child_process');
  const timers = __nodeRequire('timers');
  const https = __nodeRequire('https');

  log('sync', os.platform(), os.homedir(), fs.readdirSync(os.homedir()).length, 'entries');

  fs.promises
    .readFile('/etc/hosts', 'utf8')
    .then((s: string) => log('fs.promises', s.length, 'bytes'));
  timers.setTimeout(() => log('node timer fired'), 20);
  step('execFile', () =>
    cp.execFile('/usr/bin/sw_vers', ['-productVersion'], (err: Error | null, out: string) =>
      log('execFile sw_vers', err ? err.message : out.trim())
    )
  );
  step('https', () =>
    https
      .get('https://api.expo.dev/', (res: any) => {
        log('https status', res.statusCode);
        res.resume();
      })
      .on('error', (e: Error) => log('https error', e.message))
  );

  // The real Orbit CLI code, loaded from its build output and run in-process.
  step('listDevicesAsync', () => {
    const { createRequire } = __nodeRequire('module');
    const cliRequire = createRequire(path.resolve(CLI_ENTRY));
    const { listDevicesAsync } = cliRequire('./commands/ListDevices');
    const t1 = Date.now();
    listDevicesAsync({ platform: 'all' }).then(
      (r: any) =>
        log(
          'cli listDevicesAsync',
          Date.now() - t1,
          'ms:',
          Object.entries(r)
            .map(([k, v]: [string, any]) => `${k}=${v.devices.length}`)
            .join(' ')
        ),
      (e: Error) => log('cli listDevicesAsync failed', e.stack)
    );
  });

  log('started in', Date.now() - t0, 'ms');
}
