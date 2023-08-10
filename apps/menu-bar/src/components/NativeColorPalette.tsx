import {useState} from 'react';
import {
  FlatList,
  PlatformColor,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

const NativeColorPalette = () => {
  const [selectedColor, setSelectedColor] = useState<string>();

  return (
    <View style={styles.container}>
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
            onPress={() => Clipboard.setString(selectedColor)}>
            <Text>{selectedColor}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <FlatList
        data={colorsArray}
        renderItem={({item}) => {
          return (
            <TouchableOpacity
              style={[
                styles.smallSquare,
                {
                  backgroundColor: PlatformColor(item),
                },
              ]}
              onPress={() =>
                setSelectedColor(prev => (prev !== item ? item : undefined))
              }
            />
          );
        }}
        keyExtractor={item => item}
        numColumns={9}
      />
    </View>
  );
};

export default NativeColorPalette;

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderColor: PlatformColor('tertiaryLabelColor'),
  },
  smallSquare: {
    height: 25,
    width: 25,
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
    flex: 1,
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
  'selectedContentBackgroundColor',
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
