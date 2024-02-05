import { StorageUtils } from 'common-types';
import { Env } from 'eas-shared';
import MMKVModule from 'mmkv-node-bindings';
import os from 'os';

const storage = new MMKVModule({
  rootDir: StorageUtils.getExpoOrbitDirectory(os.homedir()),
  id: StorageUtils.MMKVInstanceId,
  logLevel: Env.isMenuBar() ? 'warning' : 'info',
});

export function getSessionSecret(): string | undefined {
  return storage.getString('sessionSecret');
}
