import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '../components';
import { secondaryText } from '../components/Text';
import { PlatformColor } from '../modules/PlatformColor';
import { useTheme } from '../providers/ThemeProvider';

type Props = {
  label: string;
  onPress: () => void;
  testID?: string;
};

/**
 * The current choice of a section, after the label of its header. A click opens a menu. It
 * reads as one line with the label. A system color, so the text stays readable when the
 * popover material changes between light and dark. A fill shows while the pointer is on it.
 */
const SectionHeaderMenu = ({ label, onPress, testID }: Props) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isHovered && { backgroundColor: getHeaderHoverColor(theme) },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      testID={testID}>
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
    </Pressable>
  );
};

// The fill of the control while the pointer is on it.
const getHeaderHoverColor = (theme: string) =>
  theme === 'dark' ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.09)';

export default SectionHeaderMenu;

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 18,
    // The label has the same text size as the title of the header but shows lower. This puts
    // its center on the center of the title.
    marginTop: -1,
    // Space for the hover fill. The negative margin keeps the label where it was.
    paddingHorizontal: 5,
    marginHorizontal: -5,
    borderRadius: 5,
    flexShrink: 1,
    cursor: 'pointer',
  },
  label: { maxWidth: 220, flexShrink: 1, ...secondaryText },
  chevron: { opacity: 0.65 },
  pressed: { opacity: 0.6 },
});
