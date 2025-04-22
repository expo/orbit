import { ElectronRudderModule } from '../src/Rudder.types';

function getAnalyticsPlatformFromPlatform(platform: string): string {
  switch (platform) {
    case 'darwin':
      return 'macos';
    case 'win32':
      return 'windows';
    default:
      return platform;
  }
}

const RudderModule: Pick<ElectronRudderModule, 'name' | 'platform'> = {
  name: 'Rudder',
  platform: getAnalyticsPlatformFromPlatform(process.platform),
};

export default RudderModule;
