import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerDebConfigOptions } from '@electron-forge/maker-deb/dist/Config';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerRpmConfigOptions } from '@electron-forge/maker-rpm/dist/Config';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { spawn } from 'child_process';
import path from 'path';

type CommonParams<T, U> = {
  [K in keyof T & keyof U]?: T[K] extends U[K] ? T[K] : never;
};

type LinuxOptions = CommonParams<MakerDebConfigOptions, MakerRpmConfigOptions>;

const linuxOptions: LinuxOptions = {
  mimeType: ['x-scheme-handler/expo-orbit'],
  icon: `./assets/images/icon-linux.png`,
  categories: ['Utility'],
  productName: 'Expo Orbit',
  genericName: 'orbit',
  homepage: 'https://github.com/expo/orbit',
};

const config: ForgeConfig = {
  packagerConfig: {
    icon: './assets/images/icon-windows',
    executableName: 'expo-orbit',
    name: 'Expo Orbit',
    extraResource: './assets',
  },
  rebuildConfig: {},
  hooks: {
    generateAssets: async () => {
      // Is running electron forge make command
      if (process.argv.some((a) => a.includes('electron-forge-make.js'))) {
        console.log('Running custom pre-make command: yarn export-web');

        const parentDir = path.resolve(__dirname, '..'); // Get the parent directory
        return new Promise((resolve, reject) => {
          const command = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
          const child = spawn(command, ['export-web'], {
            stdio: 'inherit',
            cwd: parentDir, // Set the working directory to the parent directory
          });

          child.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`preMake hook failed with exit code ${code}`));
            }
          });
        });
      }
    },
  },
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
    new MakerRpm({
      options: {
        ...linuxOptions,
        license: 'MIT',
      },
    }),
    new MakerDeb({
      options: linuxOptions,
    }),
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
