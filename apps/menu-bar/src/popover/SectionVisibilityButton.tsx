import { SymbolView } from 'expo-symbols';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { Text } from '../components';
import { secondaryText } from '../components/Text';
import { PlatformColor } from '../modules/PlatformColor';

type Props = {
  onPress: () => void;
  testID?: string;
};

/**
 * The eye that shows at the right of a section header on hover. It hides the section. Settings
 * shows the section again.
 */
const SectionVisibilityButton = ({ onPress, testID }: Props) => (
  <TouchableOpacity style={styles.button} onPress={onPress} hitSlop={6} testID={testID}>
    <SymbolView
      name="eye.slash"
      size={13}
      tintColor={PlatformColor('labelColor')}
      style={styles.icon}
      fallback={
        <Text size="tiny" style={secondaryText}>
          Hide
        </Text>
      }
    />
  </TouchableOpacity>
);

export default SectionVisibilityButton;

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', height: 18, cursor: 'pointer' },
  icon: { opacity: 0.6 },
});
