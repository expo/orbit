import { CliCommands } from 'common-types';

import MenuBarModule from '../modules/MenuBarModule';

type ShellCommandStatus = CliCommands.ShellCommand.ShellCommandStatus;

async function runShellCommandCliAsync(command: string, args: string[] = []) {
  const result = await MenuBarModule.runCli(command, args, console.log);
  return JSON.parse(result) as ShellCommandStatus;
}

export const getShellCommandStatusAsync = () => runShellCommandCliAsync('shell-command-status');

export const installShellCommandAsync = () => runShellCommandCliAsync('install-shell-command');

export const uninstallShellCommandAsync = () => runShellCommandCliAsync('uninstall-shell-command');

/**
 * Re-points an installed `orbit` command at this copy of the app. The launcher stores absolute
 * paths, which change when Orbit.app is moved or a Windows update installs into a new folder.
 * Skipped in development so a dev build never takes over the user's installed command.
 */
export const refreshShellCommandAsync = async () => {
  if (__DEV__) {
    return;
  }
  await runShellCommandCliAsync('install-shell-command', ['--refresh']);
};
