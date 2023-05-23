import React, {useCallback, useState} from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  PlatformColor,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import MenuBarModule from './MenuBarModule';
import {useDeepLinking} from './hooks/useDeepLinking';

enum Status {
  LISTENING,
  DOWNLOADING,
  INSTALLING,
  SUCCESS,
}

function App(): JSX.Element {
  const [status, setStatus] = useState(Status.LISTENING);

  useDeepLinking(
    useCallback(async ({url}) => {
      const zipUrl = `https://${url.substring(url.indexOf('://') + 3)}`;

      await MenuBarModule.runCommand(
        'node',
        [
          '/Users/gabriel/Workspace/expo/eas-cli/packages/eas-cli/build/test.js',
          zipUrl,
        ],
        data => {
          if (data.includes('Downloading app archive')) {
            setStatus(Status.DOWNLOADING);
          }
          if (data.includes('Installing your app')) {
            setStatus(Status.INSTALLING);
          }
          if (data.includes('Successfully launched')) {
            setStatus(Status.SUCCESS);
          }
          console.log(data);
        },
      );

      setTimeout(() => {
        setStatus(Status.LISTENING);
      }, 2000);
    }, []),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EAS Quick Launcher</Text>
      <View style={styles.center}>
        {status === Status.LISTENING ? (
          <Text>Listening for EAS build links</Text>
        ) : status === Status.DOWNLOADING ? (
          <View>
            <Text>Downloading...</Text>
            <ActivityIndicator />
          </View>
        ) : status === Status.INSTALLING ? (
          <View>
            <Text>Installing</Text>
          </View>
        ) : (
          <View>
            <Text>Success ✅</Text>
          </View>
        )}
      </View>

      <View style={styles.buttons}>
        <View style={styles.separator} />
        <TouchableOpacity
          onPress={() => {
            MenuBarModule.exitApp();
          }}>
          <Text>Quit</Text>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
