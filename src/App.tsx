import React, {useEffect, useState} from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  PlatformColor,
  StyleSheet,
  Linking,
} from 'react-native';

import MenuBarModule from './MenuBarModule';

function App(): JSX.Element {
  const [deeplink, setDeeplink] = useState('');
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) {
        setDeeplink(url);
      }
    });

    const listener = Linking.addEventListener('url', ({url}) => {
      setDeeplink(url);
    });

    return () => {
      listener.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EAS Menu</Text>
      <Text>Listening EAS build for links: {deeplink}</Text>
      <View style={styles.buttons}>
        <View style={styles.separator} />
        <TouchableOpacity
          onPress={() => {
            MenuBarModule.exitApp();
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
