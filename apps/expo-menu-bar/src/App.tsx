import React, {useCallback, useState} from 'react';
import {Text, TouchableOpacity, View, StyleSheet, Image} from 'react-native';

import {useDeepLinking} from './hooks/useDeepLinking';
import {downloadBuildAsync} from './modules/downloadBuildAsync';
import AutoResizerRootView from './components/AutoResizerRootView';
import CircularProgress from './components/CircularProgress';
import {useListDevices} from './hooks/useListDevices';
import ExpoIcon from './assets/icon.png';
import {getDeviceOS, listDevicesAsync} from './modules/listDevicesAsync';
import {bootDeviceAsync} from './modules/bootDeviceAsync';
import {installAndLaunchAppAsync} from './modules/installAndLaunchAppAsync';
import {launchSnackAsync} from './modules/launchSnackAsync';
import MenuBarModule from './MenuBarModule';
import RoundedIcon from './components/RoundedIcon';
import {PlatformColor} from './modules/PlatformColor';

enum Status {
  LISTENING,
  DOWNLOADING,
  INSTALLING,
  SUCCESS,
}

type Props = {
  isDevWindow: boolean;
};

function App(props: Props) {
  const [status, setStatus] = useState(Status.LISTENING);
  const [progress, setProgress] = useState(0);

  const {devices, refetch: refetchDevices} = useListDevices();

  const handleSnackUrl = async (url: string) => {
    await launchSnackAsync({url});
  };

  const handleEASUrl = async (url: string) => {
    try {
      const platform = url.endsWith('.apk') ? 'android' : 'ios';
      setStatus(Status.DOWNLOADING);
      const [device] = await listDevicesAsync({platform, oneDevice: true});
      const deviceId = device.osType === 'iOS' ? device.udid : device.name;

      const [buildPath] = await Promise.all([
        await downloadBuildAsync(url, setProgress),
        await bootDeviceAsync({
          platform,
          id: deviceId,
        }),
      ]);

      setStatus(Status.INSTALLING);
      await installAndLaunchAppAsync({platform, appPath: buildPath, deviceId});
      setStatus(Status.SUCCESS);

      setTimeout(() => {
        setStatus(Status.LISTENING);
      }, 2000);
    } catch (error) {
      console.log(`error ${error}`);
    }
  };

  useDeepLinking(
    useCallback(async ({url}) => {
      if (!props.isDevWindow) {
        const urlWithoutProtocol = url.substring(url.indexOf('://') + 3);
        const isSnackUrl = url.includes('exp.host/');

        if (isSnackUrl) {
          return handleSnackUrl(`exp://${urlWithoutProtocol}`);
        }

        handleEASUrl(`https://${urlWithoutProtocol}`);
      }
    }, []),
  );

  return (
    <AutoResizerRootView style={styles.container} enabled={!props.isDevWindow}>
      <View style={styles.titleContainer}>
        <Image source={ExpoIcon} style={styles.icon} resizeMode="contain" />
        <Text style={styles.title}>EAS Quick Launcher</Text>
      </View>
      <View style={{paddingVertical: 10}}>
        {status === Status.DOWNLOADING ? (
          <View style={styles.downloading}>
            <CircularProgress size={12} progress={progress} />
            <Text>Downloading...</Text>
          </View>
        ) : status === Status.INSTALLING ? (
          <View>
            <Text>Installing...</Text>
          </View>
        ) : null}
      </View>
      <Text style={{fontWeight: '600'}}>Devices</Text>
      {devices.slice(0, 5).map(device => {
        return (
          <TouchableOpacity
            key={device.name}
            style={styles.row}
            onPress={async () => {
              bootDeviceAsync({
                platform: getDeviceOS(device),
                id: device.osType === 'iOS' ? device.udid : device.name,
              });
              refetchDevices();
            }}>
            <RoundedIcon
              name={
                device.osType === 'iOS'
                  ? 'phone-portrait-outline'
                  : 'phone-portrait-sharp'
              }
              selected={device.state === 'Booted'}
            />
            <View>
              <Text>{device.name}</Text>
              <Text
                style={{
                  fontSize: 11,
                  opacity: 0.5,
                }}>
                {device.osType} {device.osVersion}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <View style={styles.separator} />
      <TouchableOpacity onPress={MenuBarModule.exitApp}>
        <Text>Quit</Text>
      </TouchableOpacity>
    </AutoResizerRootView>
  );
}

App.defaultProps = {
  isDevWindow: false,
};

export default App;

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  icon: {
    tintColor: PlatformColor('text'),
    height: 15,
    width: 15,
  },
  center: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  separator: {
    backgroundColor: PlatformColor('text'),
    height: 1,
    marginVertical: 5,
    opacity: 0.5,
    borderRadius: 10,
  },
  row: {
    height: 40,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  listeningContainer: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: PlatformColor('secondaryLabelColor'),
    borderRadius: 5,
    marginVertical: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});
