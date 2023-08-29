import { Image, StyleSheet } from 'react-native';

import { Text } from './Text';
import { View } from './View';
import PinWithOutline from '../assets/icons/pin-with-outline.svg';
import ProjectBackgroundIcon from '../assets/icons/project-background-icon.svg';
import { getProjectBackgroundColor } from '../utils/theme';

type Props = { name: string; iconUrl?: string; isPinned?: boolean };

export const ProjectIcon = ({ name, iconUrl, isPinned }: Props) => {
  const backgroundColor = getProjectBackgroundColor(name);

  return (
    <View style={styles.icon}>
      <View rounded="small" overflow="hidden" style={styles.icon}>
        {iconUrl ? (
          <Image source={{ uri: iconUrl }} style={styles.flex} />
        ) : (
          <View style={{ backgroundColor }} flex="1" align="centered">
            <View inset="full">
              <ProjectBackgroundIcon />
            </View>
            <Text weight="medium" size="large">
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
    width: 50,
    height: 50,
  },
  pin: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
});
