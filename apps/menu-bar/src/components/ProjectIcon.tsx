import { Image, StyleSheet } from 'react-native';

import { Text } from './Text';
import { View } from './View';
import PinWithOutline from '../assets/icons/pin-with-outline.svg';
import ProjectBackgroundIcon from '../assets/icons/project-background-icon.svg';
import { PinnedApp } from '../hooks/useGetPinnedApps.ts';
import { getProjectBackgroundColor } from '../utils/theme';

type Props = { app: PinnedApp };

export const ProjectIcon = ({ app: { name, icon, isPinned, profileImageUrl } }: Props) => {
  const backgroundColor = getProjectBackgroundColor(name);
  const iconUrl = profileImageUrl ?? icon?.url;

  return (
    <View style={styles.icon} align="centered">
      <View rounded="small" overflow="hidden" style={styles.icon}>
        {iconUrl ? (
          <View bg="secondary" flex="1" align="centered">
            <Image source={{ uri: iconUrl }} style={StyleSheet.absoluteFill} />
          </View>
        ) : (
          <View style={{ backgroundColor }} flex="1" align="centered">
            <View inset="full">
              <ProjectBackgroundIcon />
            </View>
            <Text weight="medium" size="large" style={styles.text}>
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
  icon: {
    width: 36,
    height: 36,
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
