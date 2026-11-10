import { SymbolView } from 'expo-symbols';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { Text } from '../components';
import { secondaryText } from '../components/Text';
import { PlatformColor } from '../modules/PlatformColor';

type Props = {
  label: string;
  onPress: () => void;
  testID?: string;
};

/**
 * The current choice of a section, after the label of its header. A click opens a menu. It
 * reads as one line with the label. A system color, so the text stays readable when the
 * popover material changes between light and dark.
 */
const SectionHeaderMenu = ({ label, onPress, testID }: Props) => (
  <TouchableOpacity style={styles.button} onPress={onPress} testID={testID}>
    <Text size="tiny" numberOfLines={1} style={styles.label}>
      {label}
    </Text>
    <SymbolView
      name="chevron.up.chevron.down"
      size={8}
      tintColor={PlatformColor('labelColor')}
      style={styles.chevron}
      fallback={
        <Text size="tiny" color="secondary">
          ▾
        </Text>
      }
    />
  </TouchableOpacity>
);

export default SectionHeaderMenu;

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 18,
    flexShrink: 1,
    cursor: 'pointer',
  },
  label: { maxWidth: 220, flexShrink: 1, ...secondaryText },
  chevron: { opacity: 0.65 },
});
