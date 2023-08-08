import React, {memo, PropsWithChildren, useState} from 'react';

import {Pressable, PressableProps} from 'react-native';
import {Row} from '../components';
import {useCurrentTheme} from '../utils/useExpoTheme';

const Item = ({children, onPress}: PropsWithChildren<PressableProps>) => {
  const [isHovered, setHovered] = useState(false);
  const theme = useCurrentTheme();

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={[
        // eslint-disable-next-line react-native/no-inline-styles
        {
          borderRadius: 4,
          marginHorizontal: 6,
        },
        // eslint-disable-next-line react-native/no-inline-styles
        isHovered && {
          backgroundColor:
            theme === 'dark' ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)',
        },
      ]}>
      <Row gap="1.5" my="tiny" px="2.5">
        {children}
      </Row>
    </Pressable>
  );
};

export default memo(Item);
