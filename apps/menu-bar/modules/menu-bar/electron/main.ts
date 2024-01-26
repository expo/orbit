import path from 'path';

import spawnCliAsync from './spawnCliAsync';

const runCli = async (event: any, command: any, args: any, listenerId: any) => {
  // eslint-disable-next-line no-undef
  const cliPath = path.join(__dirname, '../../../../cli/build/index.js');

  const commandOutput = await spawnCliAsync(cliPath, command, args, listenerId);
  return commandOutput;
};

const MenuBarModule = {
  name: 'MenuBar',
  runCli,
};

export default MenuBarModule;
