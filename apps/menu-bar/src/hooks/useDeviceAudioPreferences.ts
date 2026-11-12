import { useEffect, useState } from 'react';

import {
  addStorageListener,
  getUserPreferences,
  userPreferencesStorageKey,
} from '../modules/Storage';

export const useDeviceAudioPreferences = () => {
  const [isEmulatorWithoutAudio, setEmulatorWithoutAudio] = useState<boolean>(
    getUserPreferences().emulatorWithoutAudio
  );

  useEffect(() => {
    return addStorageListener((key) => {
      if (key === userPreferencesStorageKey) {
        setEmulatorWithoutAudio(getUserPreferences().emulatorWithoutAudio);
      }
    });
  }, []);

  return {
    emulatorWithoutAudio: isEmulatorWithoutAudio,
  };
};
