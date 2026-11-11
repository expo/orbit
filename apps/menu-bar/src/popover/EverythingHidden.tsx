import { StyleSheet, TouchableOpacity } from 'react-native';

import { Text, View } from '../components';
import { secondaryText } from '../components/Text';
import { openSettingsPane } from '../windows/settingsPane';

export const EVERYTHING_HIDDEN_HEIGHT = 132;

/** Shows when the user hid every section of the popover. */
const EverythingHidden = () => (
  <View style={styles.container} testID="everything-hidden">
    <Text style={styles.emoji}>🫥</Text>
    <Text weight="semibold">You hid everything. Bold move.</Text>
    <Text size="tiny" style={[secondaryText, styles.description]}>
      Orbit is now a very small icon with a Quit button.
    </Text>
    <TouchableOpacity
      style={styles.link}
      onPress={() => openSettingsPane('platforms')}
      testID="everything-hidden-settings">
      <Text size="tiny" color="link">
        Bring the sections back in Settings
      </Text>
    </TouchableOpacity>
  </View>
);

export default EverythingHidden;

const styles = StyleSheet.create({
  container: {
    height: EVERYTHING_HIDDEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emoji: { fontSize: 28, lineHeight: 36 },
  description: { textAlign: 'center', marginTop: 2 },
  link: { marginTop: 8, cursor: 'pointer' },
});
