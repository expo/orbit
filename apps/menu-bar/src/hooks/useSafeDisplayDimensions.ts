import {useEffect, useState} from 'react';
import {DeviceEventEmitter, Dimensions} from 'react-native';

export const SAFE_AREA_FACTOR = 0.85;

export const useSafeDisplayDimensions = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('screen'));

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('popoverFocused', () => {
      setDimensions(Dimensions.get('screen'));
    });

    return () => {
      listener.remove();
    };
  }, []);

  return {
    ...dimensions,
    height: dimensions.height * SAFE_AREA_FACTOR,
    width: dimensions.width * SAFE_AREA_FACTOR,
  };
};
