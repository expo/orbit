import React, {useCallback, useEffect, useState} from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  PlatformColor,
  StyleSheet,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {useDeepLinking} from './hooks/useDeepLinking';
import {downloadBuildAsync} from './commands/downloadBuildAsync';
import AutoResizerRootView from './components/AutoResizerRootView';
import CircularProgress from './components/CircularProgress';
import {useListDevices} from './hooks/useListDevices';
import ExpoIcon from './assets/icon.png';
import {listDevicesAsync} from './commands/listDevicesAsync';
import {bootDeviceAsync} from './commands/bootDeviceAsync';
import {installAndLaunchAppAsync} from './commands/installAndLaunchAppAsync';
import {launchSnackAsync} from './commands/launchSnackAsync';
import MenuBarModule from './modules/MenuBarModule';
import FilePicker from './modules/FilePickerModule';
import {getPlatformFromURI} from './utils/parseUrl';
import DeviceItem from './components/DeviceItem';
import {getDeviceOS} from './utils/device';
import {WindowsNavigator} from './windows';
import {hasSeenOnboardingStorageKey} from './windows/Onboarding';

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
  const [selectedDevices, setSelectedDevices] = useState<{
    android?: string;
    ios?: string;
  }>({android: undefined, ios: undefined});

  const [status, setStatus] = useState(Status.LISTENING);
  const [progress, setProgress] = useState(0);

  const {devices, refetch: refetchDevices} = useListDevices();

  useEffect(() => {
    AsyncStorage.getItem(hasSeenOnboardingStorageKey).then(value => {
      if (!value) {
        WindowsNavigator.open('Onboarding');
      }
    });
  }, []);

  const handleSnackUrl = async (url: string) => {
    await launchSnackAsync({url});
  };

  const handleEASUrl = async (url: string) => {
    try {
      const platform = getPlatformFromURI(url);
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
      await installAndLaunchAppAsync({appPath: buildPath, deviceId});
      setStatus(Status.SUCCESS);

      setTimeout(() => {
        setStatus(Status.LISTENING);
      }, 2000);
    } catch (error) {
      console.log(`error ${error}`);
    }
  };

  const openFilePicker = async () => {
    const appPath = await FilePicker.getAppAsync();
    const platform = getPlatformFromURI(appPath);

    const [device] = await listDevicesAsync({platform, oneDevice: true});
    const deviceId = device.osType === 'iOS' ? device.udid : device.name;

    await installAndLaunchAppAsync({
      appPath,
      deviceId,
    });
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
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          paddingHorizontal: 10,
        }}>
        <View style={styles.titleContainer}>
          <Image source={ExpoIcon} style={styles.icon} resizeMode="contain" />
          <Text style={styles.title}>Quick Launcher</Text>
        </View>
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
      <Text
        style={{
          paddingHorizontal: 10,
          fontWeight: '500',
          color: PlatformColor('secondaryLabelColor'),
        }}>
        Devices
      </Text>
      <View
        style={{
          gap: 5,
          paddingHorizontal: 5,
          flexShrink: 1,
          overflow: 'hidden',
        }}>
        <FlatList
          data={devices}
          alwaysBounceVertical={false}
          renderItem={({item: device}) => {
            const platform = getDeviceOS(device);
            const id = device.osType === 'iOS' ? device.udid : device.name;

            return (
              <DeviceItem
                device={device}
                key={device.name}
                onPress={async () => {
                  setSelectedDevices(prev => ({
                    ...prev,
                    [platform]: id,
                  }));
                  if (device.state !== 'Booted') {
                    await bootDeviceAsync({platform, id});
                    refetchDevices();
                  }
                }}
                selected={selectedDevices[platform] === id}
              />
            );
          }}
        />
      </View>
      <View style={{paddingHorizontal: 10}}>
        <View style={styles.separator} />
        <TouchableOpacity onPress={openFilePicker}>
          <Text>Launch app from local file</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity onPress={() => WindowsNavigator.open('Settings')}>
          <Text>Settings</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity onPress={MenuBarModule.exitApp}>
          <Text>Quit</Text>
        </TouchableOpacity>
      </View>
    </AutoResizerRootView>
  );
}

App.defaultProps = {
  isDevWindow: false,
};

export default App;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    minWidth: 300,
    maxHeight: Dimensions.get('screen').height * 0.85,
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
