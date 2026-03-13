import { CliCommands } from 'common-types';

import MenuBarModule from '../modules/MenuBarModule';

export const detectAppleAppTypeAsync = async (
  appPath: string
): Promise<CliCommands.DetectAppleAppType.AppleAppInfo> => {
  const result = await MenuBarModule.runCli('detect-apple-app-type', [appPath], console.log);

  return JSON.parse(result) as CliCommands.DetectAppleAppType.AppleAppInfo;
};
