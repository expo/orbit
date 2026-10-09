import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  ShellCommandContext,
  createPosixShim,
  createWindowsShim,
  getShellCommandStatusAsync,
  installShellCommandAsync,
  uninstallShellCommandAsync,
} from './ShellCommand';

let homedir: string;

beforeEach(() => {
  homedir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-shell-command-'));
});

afterEach(() => {
  fs.rmSync(homedir, { recursive: true, force: true });
});

function createContext(overrides: Partial<ShellCommandContext> = {}): ShellCommandContext {
  return {
    platform: 'linux',
    homedir,
    launcher: { command: ['/opt/Expo Orbit/expo-orbit', '/opt/cli/index.js'], env: {} },
    exec: jest.fn(async () => ''),
    pathEntries: async () => [path.join(homedir, '.local', 'bin')],
    ...overrides,
  };
}

const shimPath = () => path.join(homedir, '.expo', 'orbit', 'bin', 'orbit');
const linkPath = () => path.join(homedir, '.local', 'bin', 'orbit');

describe('createPosixShim', () => {
  it('forwards arguments, environment and exit code to the bundled CLI', () => {
    const script = path.join(homedir, "it's a cli.js");
    fs.writeFileSync(
      script,
      `console.log(JSON.stringify({ args: process.argv.slice(2), env: process.env.ORBIT_HELPER_BIN_DIR })); process.exit(3);`
    );
    const shim = path.join(homedir, 'orbit');
    fs.writeFileSync(
      shim,
      createPosixShim({
        command: [process.execPath, script],
        env: { ORBIT_HELPER_BIN_DIR: "/Applications/Expo Orbit's.app/bin" },
      }),
      { mode: 0o755 }
    );

    const result = spawnSync(shim, ['list-devices', 'two words', `'quoted' "$HOME"`], {
      encoding: 'utf8',
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout)).toEqual({
      args: ['list-devices', 'two words', `'quoted' "$HOME"`],
      env: "/Applications/Expo Orbit's.app/bin",
    });
  });

  it('explains how to recover when the app has moved', () => {
    const shim = path.join(homedir, 'orbit');
    fs.writeFileSync(shim, createPosixShim({ command: ['/nonexistent/orbit-cli'], env: {} }), {
      mode: 0o755,
    });

    const result = spawnSync(shim, [], { encoding: 'utf8' });

    expect(result.status).toBe(127);
    expect(result.stderr).toContain('Open Expo Orbit once to repair this command');
  });
});

describe('createWindowsShim', () => {
  it('runs Electron as Node with escaped paths', () => {
    const shim = createWindowsShim({
      command: [
        'C:\\Users\\me\\AppData\\Local\\ExpoOrbit\\app-2.8.0\\expo-orbit.exe',
        'C:\\100%\\cli.js',
      ],
      env: { ELECTRON_RUN_AS_NODE: '1' },
    });

    expect(shim.split('\r\n')).toEqual(
      expect.arrayContaining([
        'set "ELECTRON_RUN_AS_NODE=1"',
        '"C:\\Users\\me\\AppData\\Local\\ExpoOrbit\\app-2.8.0\\expo-orbit.exe" "C:\\100%%\\cli.js" %*',
        'exit /b %ERRORLEVEL%',
      ])
    );
  });
});

describe('installShellCommandAsync (POSIX)', () => {
  it('writes the shim and links it into PATH', async () => {
    const status = await installShellCommandAsync({}, createContext());

    expect(status).toEqual({
      installed: true,
      onPath: true,
      shimPath: shimPath(),
      linkPath: linkPath(),
    });
    expect(fs.readlinkSync(linkPath())).toBe(shimPath());
    expect(fs.statSync(shimPath()).mode & 0o111).toBeTruthy();
    expect(fs.readFileSync(shimPath(), 'utf8')).toContain(`exec '/opt/Expo Orbit/expo-orbit'`);
  });

  it('is idempotent', async () => {
    await installShellCommandAsync({}, createContext());
    await expect(installShellCommandAsync({}, createContext())).resolves.toMatchObject({
      installed: true,
    });
  });

  it('restores a deleted shim behind an existing link', async () => {
    await installShellCommandAsync({}, createContext());
    fs.rmSync(shimPath());

    await expect(installShellCommandAsync({}, createContext())).resolves.toMatchObject({
      installed: true,
    });
  });

  it('reports when the link directory is not on PATH', async () => {
    const status = await installShellCommandAsync(
      {},
      createContext({ pathEntries: async () => [] })
    );

    expect(status).toMatchObject({ installed: true, onPath: false });
  });

  it('never overwrites an `orbit` it did not install', async () => {
    fs.mkdirSync(path.dirname(linkPath()), { recursive: true });
    fs.writeFileSync(linkPath(), 'someone else');

    await expect(installShellCommandAsync({}, createContext())).rejects.toMatchObject({
      code: 'SHELL_COMMAND_CONFLICT',
    });
    await uninstallShellCommandAsync(createContext());
    expect(fs.readFileSync(linkPath(), 'utf8')).toBe('someone else');
    expect(fs.existsSync(shimPath())).toBe(false);
  });

  it('removes the link and the shim on uninstall', async () => {
    await installShellCommandAsync({}, createContext());

    const status = await uninstallShellCommandAsync(createContext());

    expect(status).toMatchObject({ installed: false });
    expect(fs.existsSync(linkPath())).toBe(false);
    expect(fs.existsSync(shimPath())).toBe(false);
  });
});

describe('installShellCommandAsync({ refresh: true })', () => {
  it('does nothing when the command was never installed', async () => {
    const status = await installShellCommandAsync({ refresh: true }, createContext());

    expect(status.installed).toBe(false);
    expect(fs.existsSync(shimPath())).toBe(false);
  });

  it('re-points an installed shim at the running app', async () => {
    await installShellCommandAsync({}, createContext());

    await installShellCommandAsync(
      { refresh: true },
      createContext({
        launcher: { command: ['/opt/Moved Orbit/expo-orbit', '/opt/cli/index.js'], env: {} },
      })
    );

    expect(fs.readFileSync(shimPath(), 'utf8')).toContain(`exec '/opt/Moved Orbit/expo-orbit'`);
  });
});

describe('installShellCommandAsync (macOS without write access)', () => {
  let linkDir: string;
  beforeEach(() => {
    const parent = path.join(homedir, 'root-owned');
    fs.mkdirSync(parent);
    linkDir = path.join(parent, 'bin');
    fs.chmodSync(parent, 0o555);
  });
  afterEach(() => {
    fs.chmodSync(path.dirname(linkDir), 0o755);
  });

  it('asks for administrator permission', async () => {
    // Stand in for osascript by running the privileged command directly once access is granted.
    const exec = jest.fn(async (_file: string, args: string[]) => {
      fs.chmodSync(path.dirname(linkDir), 0o755);
      execFileSync('/bin/sh', ['-c', args[6]]);
      return '';
    });
    const context = createContext({
      platform: 'darwin',
      linkDir,
      exec,
      pathEntries: async () => [linkDir],
    });

    const status = await installShellCommandAsync({}, context);

    expect(exec).toHaveBeenCalledWith('/usr/bin/osascript', expect.any(Array));
    expect(exec.mock.calls[0][1][7]).toContain(linkDir);
    expect(status).toMatchObject({ installed: true, onPath: true });
  });

  it('reports a cancelled administrator prompt', async () => {
    const context = createContext({
      platform: 'darwin',
      linkDir,
      exec: jest.fn(async () => {
        throw new Error('User canceled. (-128)');
      }),
    });

    await expect(installShellCommandAsync({}, context)).rejects.toMatchObject({
      code: 'SHELL_COMMAND_PERMISSION_DENIED',
    });
  });
});

describe('installShellCommandAsync (Windows)', () => {
  // Windows paths are plain relative file names on the POSIX host running the tests, so work
  // from the temporary directory to keep the shim inside it.
  const windowsHomedir = 'C:\\Users\\me';
  const shimDir = 'C:\\Users\\me\\.expo\\orbit\\bin';
  let cwd: string;
  beforeEach(() => {
    cwd = process.cwd();
    process.chdir(homedir);
  });
  afterEach(() => {
    process.chdir(cwd);
  });

  it('adds the shim directory to the user PATH', async () => {
    const exec = jest.fn(async () => '');
    const context = createContext({
      platform: 'win32',
      homedir: windowsHomedir,
      launcher: {
        command: ['C:\\ExpoOrbit\\app-2.8.0\\expo-orbit.exe', 'C:\\cli\\index.js'],
        env: { ELECTRON_RUN_AS_NODE: '1' },
      },
      exec,
      pathEntries: async () => [],
    });

    await installShellCommandAsync({}, context);

    expect(exec).toHaveBeenCalledWith('powershell.exe', expect.any(Array), {
      ORBIT_SHELL_COMMAND_MODE: 'add',
      ORBIT_SHELL_COMMAND_DIR: shimDir,
    });
    expect(fs.readFileSync(`${shimDir}\\orbit.cmd`, 'utf8')).toContain('ELECTRON_RUN_AS_NODE');
  });

  it('is installed once the user PATH contains the shim directory', async () => {
    const context = createContext({
      platform: 'win32',
      homedir: windowsHomedir,
      pathEntries: async () => ['C:\\Windows', shimDir.toUpperCase()],
    });

    expect((await getShellCommandStatusAsync(context)).installed).toBe(false);
    await installShellCommandAsync({}, context);
    expect((await getShellCommandStatusAsync(context)).installed).toBe(true);
  });
});
