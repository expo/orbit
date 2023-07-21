import {memo} from 'react';
import {PlatformColor} from 'react-native';

import ExpoOrbitIcon from '../assets/images/expo-orbit-text.svg';
import {Divider, Spacer, View} from '../components';

const Header = () => {
  return (
    <View padding="medium" pb="small">
      <ExpoOrbitIcon fill={PlatformColor('text')} />
      <Spacer.Vertical size="small" />
      <Divider />
    </View>
  );
};

export default memo(Header);
