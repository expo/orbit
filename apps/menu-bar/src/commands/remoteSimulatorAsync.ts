import { RemoteSimulatorList, RemoteSimulatorOptions } from 'common-types/build/devices';

import MenuBarModule from '../modules/MenuBarModule';

export const listRemoteSimulatorsAsync = async () => {
  const result = await MenuBarModule.runCli('list-remote-simulators', [], undefined);
  return JSON.parse(result) as RemoteSimulatorList;
};

export const listRemoteSimulatorOptionsAsync = async (appId: string) => {
  const result = await MenuBarModule.runCli(
    'list-remote-simulator-options',
    ['--app-id', appId],
    undefined
  );
  return JSON.parse(result) as RemoteSimulatorOptions;
};

export const stopRemoteSimulatorAsync = async (id: string) => {
  await MenuBarModule.runCli('stop-remote-simulator', ['--id', id], undefined);
};
