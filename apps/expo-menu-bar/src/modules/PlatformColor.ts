import {Platform, PlatformColor as RNPlatformColor} from 'react-native';

const windowsColorsMap: {[key: string]: string} = {
  text: 'SystemColorWindowTextColor',
};

export const PlatformColor = (name: string) => {
  let platformColorName = name;
  if (Platform.OS === 'windows') {
    if (windowsColorsMap[platformColorName]) {
      platformColorName = windowsColorsMap[platformColorName];
    } else {
      platformColorName = 'SystemColorWindowTextColor';
      console.warn(`PlatformColor ${name} not found on windows colors map`);
    }
  }

  return RNPlatformColor(platformColorName);
};
