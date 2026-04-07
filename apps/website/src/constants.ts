export const SCHEME = 'expo-orbit://';

export const LOCAL_SERVER_PORTS = [35783, 47909, 44171, 50799];

export const GITHUB_RELEASES_URL = 'https://github.com/expo/orbit/releases/latest';
export const DOCS_URL = 'https://docs.expo.dev/build/orbit/';

export const GITHUB_URL = 'https://github.com/expo/orbit';

export const DEEPLINK_PATHS = ['download', 'update', 'go', 'snack'] as const;

export type DeeplinkPath = (typeof DEEPLINK_PATHS)[number];

export const DEEPLINK_META: Record<DeeplinkPath, { title: string; description: string }> = {
  download: {
    title: 'Opening build in Expo Orbit...',
    description:
      'Downloading and installing this build on your simulator or emulator via Expo Orbit.',
  },
  update: {
    title: 'Opening update in Expo Orbit...',
    description: 'Launching this EAS Update on your local device via Expo Orbit.',
  },
  go: {
    title: 'Launching project in Expo Orbit...',
    description: 'Opening this project in Expo Go via Expo Orbit.',
  },
  snack: {
    title: 'Opening Snack in Expo Orbit...',
    description: 'Previewing this Snack project locally via Expo Orbit.',
  },
};
