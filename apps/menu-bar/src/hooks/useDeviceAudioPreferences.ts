import { useEffect, useState } from 'react';

import { getUserPreferences, storage, userPreferencesStorageKey } from '../modules/Storage';

export const useDeviceAudioPreferences = () => {
  const [isEmulatorWithoutAudio, setEmulatorWithoutAudio] = useState<boolean>(
    getUserPreferences().emulatorWithoutAudio
  );

  useEffect(() => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === userPreferencesStorageKey) {
        setEmulatorWithoutAudio(getUserPreferences().emulatorWithoutAudio);
      }
    });

    return () => {
      listener.remove();
    };
  }, []);

  return {
    emulatorWithoutAudio: isEmulatorWithoutAudio,
  };
};
