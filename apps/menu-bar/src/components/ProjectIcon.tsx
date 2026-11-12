import { Image, StyleSheet } from 'react-native';

import { Text } from './Text';
import { View } from './View';
import PinWithOutline from '../assets/icons/pin-with-outline.svg';
import ProjectBackgroundIcon from '../assets/icons/project-background-icon.svg';
import { PinnedApp } from '../hooks/useGetPinnedApps.ts';
import { getProjectBackgroundColor } from '../utils/theme';

type Props = { app: PinnedApp; size?: number };

export const ProjectIcon = ({ app: { name, isPinned, profileImageUrl }, size = 36 }: Props) => {
  const backgroundColor = getProjectBackgroundColor(name);
  const iconStyle = { width: size, height: size };

  return (
    <View style={iconStyle} align="centered">
      <View
        rounded="small"
        overflow="hidden"
        style={[iconStyle, size > 36 && { borderRadius: Math.round(size * 0.23) }]}>
        {profileImageUrl ? (
          <View bg="secondary" flex="1" align="centered">
            <Image source={{ uri: profileImageUrl }} style={StyleSheet.absoluteFill} />
          </View>
        ) : (
          <View style={{ backgroundColor }} flex="1" align="centered">
            <View inset="full">
              <ProjectBackgroundIcon />
            </View>
            <Text
              weight="medium"
              size="large"
              style={[styles.text, size > 36 && { fontSize: 22, lineHeight: 26 }]}>
              {name[0]?.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      {isPinned ? <PinWithOutline style={styles.pin} height={14} width={14} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  pin: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  text: {
    textAlign: 'center',
  },
});
