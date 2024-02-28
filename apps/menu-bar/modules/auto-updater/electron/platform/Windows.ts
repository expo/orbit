import { spawn } from 'child_process';
import path from 'path';

import Platform from './Platform';
import { quit } from '../utils/quit';

const SQUIRREL_INSTALL = 'squirrel-install';
const SQUIRREL_UPDATED = 'squirrel-updated';
const SQUIRREL_UNINSTALL = 'squirrel-uninstall';
const SQUIRREL_OBSOLETE = 'squirrel-obsolete';

const SQUIRREL_ACTIONS = [
  SQUIRREL_INSTALL,
  SQUIRREL_UPDATED,
  SQUIRREL_UNINSTALL,
  SQUIRREL_OBSOLETE,
] as const;

export default class Windows extends Platform {
  init() {
    const squirrelAction = this.getSquirrelInstallerAction();
    if (!squirrelAction) {
      return;
    }

    const event = { squirrelAction, preventDefault: false };
    this.emit('squirrel-win-installer', event);

    if (!event.preventDefault) {
      processSquirrelInstaller(squirrelAction);
      process.exit();
    }
  }

  getSquirrelInstallerAction(
    argv1 = process.argv[1]
  ): (typeof SQUIRREL_ACTIONS)[number] | undefined {
    const handledArguments = SQUIRREL_ACTIONS.map((act) => `--${act}`);
    const actionIndex = handledArguments.indexOf(argv1);
    return actionIndex > -1 ? SQUIRREL_ACTIONS[actionIndex] : undefined;
  }
}

function processSquirrelInstaller(action: string) {
  const execPath = path.basename(process.execPath);

  switch (action) {
    case SQUIRREL_INSTALL:
    case SQUIRREL_UPDATED: {
      run([`--createShortcut=${execPath}`], quit);
      return true;
    }
    case SQUIRREL_UNINSTALL: {
      run([`--removeShortcut=${execPath}`], quit);
      return false;
    }
    case SQUIRREL_OBSOLETE: {
      quit();
      return false;
    }
    default: {
      return false;
    }
  }
}

function run(args: string[], done: () => void) {
  const updateExe = path.resolve(path.dirname(process.execPath), '../Update.exe');
  spawn(updateExe, args, { detached: true }).on('close', done);
}
