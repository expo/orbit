import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  PlatformColor,
  StyleSheet,
} from 'react-native';

import MenuBarModule from './MenuBarModule';
import {useDeepLinking} from './hooks/useDeepLinking';
import {downloadBuildAsync} from './modules/downloadBuildAsync';
import AutoResizerRootView from './components/AutoResizerRootView';
import CircularProgress from './components/CircularProgress';

enum Status {
  LISTENING,
  DOWNLOADING,
  INSTALLING,
  SUCCESS,
}

type Props = {
  shouldAutoResize: boolean;
};

function App(props: Props) {
  const [status, setStatus] = useState(Status.LISTENING);
  const [progress, setProgress] = useState(0);
  const [devicesCount, setDevicesCount] = useState(1);

  const main = async () => {
    try {
      setStatus(Status.DOWNLOADING);
      const buildPath = await downloadBuildAsync(
        'http://expo.dev/artifacts/eas/hAo1tq1ieGW2QVjHcjDbAP.tar.gz',
        setProgress,
      );
      setStatus(Status.INSTALLING);
      // await installBuildAsync(buildPath, setProgress);
      setStatus(Status.SUCCESS);

      setTimeout(() => {
        setStatus(Status.LISTENING);
      }, 2000);
      console.log('buildPath', buildPath);
    } catch (error) {
      console.log(`error ${error}`);
    }
  };

  useDeepLinking(
    useCallback(async ({url}) => {
      const zipUrl = `https://${url.substring(url.indexOf('://') + 3)}`;

      setStatus(Status.DOWNLOADING);
      const buildPath = await downloadBuildAsync(zipUrl, () => {});
      setStatus(Status.INSTALLING);
      // await installBuildAsync(buildPath, setProgress);
      setStatus(Status.SUCCESS);

      setTimeout(() => {
        setStatus(Status.LISTENING);
      }, 2000);
    }, []),
  );

  return (
    <AutoResizerRootView
      style={styles.container}
      enabled={props.shouldAutoResize}>
      <Text style={styles.title}>EAS Quick Launcher</Text>
      <View style={styles.center}>
        {status === Status.LISTENING ? (
          <Text>Listening for EAS build links</Text>
        ) : status === Status.DOWNLOADING ? (
          <View style={{alignItems: 'center'}}>
            <Text>Downloading...</Text>
            <CircularProgress progress={progress} />
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
      <View>
        {Array.from({length: devicesCount})
          .fill('')
          .map((_, i) => (
            <Text key={i}>Device {i}</Text>
          ))}
      </View>
      <View>
        <View style={styles.separator} />
        <TouchableOpacity onPress={() => setDevicesCount(prev => prev + 1)}>
          <Text>Add devices</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={main}>
          <Text>Download</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity
          onPress={() => {
            MenuBarModule.exitApp();
          }}>
          <Text>Quit</Text>
        </TouchableOpacity>
      </View>
    </AutoResizerRootView>
  );
}

App.defaultProps = {
  shouldAutoResize: true,
};

export default App;

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  center: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  separator: {
    backgroundColor: PlatformColor('text'),
    height: 1,
    marginVertical: 5,
    opacity: 0.5,
    borderRadius: 10,
  },
});
