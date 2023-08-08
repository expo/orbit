import React, {memo, PropsWithChildren, useState} from 'react';

import {Pressable, PressableProps, StyleSheet} from 'react-native';
import {Row, Text} from '../components';
import {useCurrentTheme} from '../utils/useExpoTheme';

type Props = PropsWithChildren<PressableProps> & {
  shortcut?: string;
};

const Item = ({children, onPress, shortcut}: Props) => {
  const [isHovered, setHovered] = useState(false);
  const theme = useCurrentTheme();

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={[
        styles.itemContainer,
        // eslint-disable-next-line react-native/no-inline-styles
        isHovered && {
          backgroundColor:
            theme === 'dark' ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)',
        },
      ]}>
      <Row gap="1.5" my="tiny" px="2.5">
        {children}
        {shortcut && <Text style={styles.shortcut}>{shortcut}</Text>}
      </Row>
    </Pressable>
  );
};

export default memo(Item);

const styles = StyleSheet.create({
  itemContainer: {
    borderRadius: 4,
    marginHorizontal: 6,
  },
  shortcut: {
    marginLeft: 'auto',
    opacity: 0.4,
  },
});
