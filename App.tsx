import React from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  BackHandler,
  PlatformColor,
  StyleSheet,
} from 'react-native';

function App(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>EAS Menu</Text>
      <Text>Deep link:</Text>
      <View style={styles.buttons}>
        <View style={styles.separator} />
        <TouchableOpacity
          onPress={() => {
            BackHandler.exitApp();
          }}>
          <Text>Quit EAS Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default App;

const styles = StyleSheet.create({
  container: {
    padding: 10,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  buttons: {
    marginTop: 'auto',
  },
  separator: {
    backgroundColor: PlatformColor('text'),
    height: 1,
    marginVertical: 5,
    opacity: 0.5,
    borderRadius: 10,
  },
});
