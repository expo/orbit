import {useCallback, useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';

import {getUserPreferences} from '../modules/Storage';

export const useDeviceAudioPreferences = () => {
  const [isEmulatorWithoutAudio, setEmulatorWithoutAudio] = useState<boolean>();

  const getAudioPreferences = useCallback(async () => {
    const {emulatorWithoutAudio} = await getUserPreferences();
    setEmulatorWithoutAudio(emulatorWithoutAudio);
  }, []);

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('popoverFocused', () => {
      getAudioPreferences();
    });
    getAudioPreferences();

    return () => {
      listener.remove();
    };
  }, [getAudioPreferences]);

  return {
    emulatorWithoutAudio: isEmulatorWithoutAudio,
  };
};
