import { StorageUtils } from 'common-types';
import os from 'os';

const MMKVModule = require('nodejs-mmkv');
const storage = new MMKVModule({
  rootDir: StorageUtils.getExpoOrbitDirectory(os.homedir()),
  id: StorageUtils.MMKVInstanceId,
});

export function getSessionSecret(): string | undefined {
  return storage.getString('sessionSecret');
}
