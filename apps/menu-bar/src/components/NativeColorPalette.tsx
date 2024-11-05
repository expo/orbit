import { useClipboard } from '@react-native-clipboard/clipboard';
import { useState } from 'react';
import { FlatList, TouchableOpacity, Text, View, StyleSheet } from 'react-native';

import { PlatformColor } from '../modules/PlatformColor';

const SMALL_SQUARE_SIZE = 25;
const NUMBER_OF_COLUMNS = 9;

const NativeColorPalette = () => {
  const [selectedColor, setSelectedColor] = useState<string>();
  const [, setClipboardString] = useClipboard();
  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'flex-start' }}>
        <FlatList
          data={colorsArray}
          renderItem={({ item }) => {
            return (
              <TouchableOpacity
                style={[
                  styles.smallSquare,
                  {
                    backgroundColor: PlatformColor(item),
                  },
                ]}
                onPress={() => setSelectedColor((prev) => (prev !== item ? item : undefined))}
              />
            );
          }}
          keyExtractor={(item) => item}
          numColumns={NUMBER_OF_COLUMNS}
        />
      </View>
      {selectedColor ? (
        <View style={styles.selectedContainer}>
          <View
            style={[
              styles.bigSquare,
              {
                backgroundColor: PlatformColor(selectedColor),
              },
            ]}
          />
          <TouchableOpacity
            style={styles.selectedColorText}
            onPress={() => setClipboardString(selectedColor)}>
            <Text>{selectedColor}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

export default NativeColorPalette;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: PlatformColor('tertiaryLabelColor'),
  },
  smallSquare: {
    height: SMALL_SQUARE_SIZE,
    width: SMALL_SQUARE_SIZE,
  },
  bigSquare: {
    height: 40,
    width: 40,
  },
  selectedContainer: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    padding: 5,
  },
  selectedColorText: {
    margin: 10,
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
