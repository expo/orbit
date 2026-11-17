import { Pressable, StyleSheet, View } from 'react-native';

import { PlatformColor } from '../modules/PlatformColor';

// react-native-macos shows `tooltip` on hover; its types do not declare the prop.
const tooltip = (text: string) => ({ tooltip: text }) as object;

const NativeColorPalette = ({ onPress }: { onPress: (name: string) => void }) => (
  <View style={styles.grid}>
    {colorsArray.map((name) => (
      <Pressable
        key={name}
        {...tooltip(name)}
        accessibilityLabel={name}
        onPress={() => onPress(name)}
        style={[styles.swatch, { backgroundColor: PlatformColor(name) }]}
      />
    ))}
  </View>
);

export default NativeColorPalette;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  // Seven columns fit the 280pt Debug Menu sidebar.
  swatch: {
    width: 27,
    height: 27,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.35)',
  },
});

const colorsArray = [
  'labelColor',
  'secondaryLabelColor',
  'tertiaryLabelColor',
  'quaternaryLabelColor',
  'textColor',
  'placeholderTextColor',
  'selectedTextColor',
  'textBackgroundColor',
  'selectedTextBackgroundColor',
  'keyboardFocusIndicatorColor',
  'unemphasizedSelectedTextColor',
  'unemphasizedSelectedTextBackgroundColor',
  'linkColor',
  'separatorColor',
  'selectedContentBackground',
  'unemphasizedSelectedContentBackgroundColor',
  'selectedMenuItemTextColor',
  'gridColor',
  'headerTextColor',
  'alternatingEvenContentBackgroundColor',
  'alternatingOddContentBackgroundColor',
  'controlAccentColor',
  'controlColor',
  'controlBackgroundColor',
  'controlTextColor',
  'disabledControlTextColor',
  'selectedControlColor',
  'selectedControlTextColor',
  'alternateSelectedControlTextColor',
  'scrubberTexturedBackgroundColor',
  'windowBackgroundColor',
  'windowFrameTextColor',
  'underPageBackgroundColor',
  'findHighlightColor',
  'highlightColor',
  'shadowColor',
  'systemBlueColor',
  'systemBrownColor',
  'systemGrayColor',
  'systemGreenColor',
  'systemOrangeColor',
  'systemPinkColor',
  'systemPurpleColor',
  'systemRedColor',
  'systemYellowColor',
];
