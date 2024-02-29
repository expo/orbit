import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';

const config: ForgeConfig = {
  packagerConfig: {
    icon: './assets/images/icon-windows',
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'ExpoOrbit',
      authors: 'Expo',
      description:
        'Accelerate your development workflow with one-click build launches and simulator management from your menu bar',
      iconUrl:
        'https://raw.githubusercontent.com/expo/orbit/main/apps/menu-bar/electron/assets/images/icon-windows.ico',
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({ options: { icon: './assets/images/icon-linux.png' } }),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: './src/main.ts',
          config: 'vite.main.config.mts',
        },
        {
          entry: './src/preload.ts',
          config: 'vite.preload.config.ts',
        },
        {
          // compile CLI and inject it into the electron internal files
          entry: '../../cli/src/index.ts',
          config: 'vite.cli.config.ts',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};

export default config;
