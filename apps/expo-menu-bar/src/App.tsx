import React, {useCallback, useEffect, useState} from 'react';
import {
  TouchableOpacity,
  PlatformColor,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {useDeepLinking} from './hooks/useDeepLinking';
import {downloadBuildAsync} from './commands/downloadBuildAsync';
import AutoResizerRootView from './components/AutoResizerRootView';
import {useListDevices} from './hooks/useListDevices';
import {listDevicesAsync} from './commands/listDevicesAsync';
import {bootDeviceAsync} from './commands/bootDeviceAsync';
import {installAndLaunchAppAsync} from './commands/installAndLaunchAppAsync';
import {launchSnackAsync} from './commands/launchSnackAsync';
import MenuBarModule from './modules/MenuBarModule';
import FilePicker from './modules/FilePickerModule';
import {getPlatformFromURI} from './utils/parseUrl';
import DeviceItem from './components/DeviceItem';
import {Device, getDeviceId, getDeviceOS} from './utils/device';
import {WindowsNavigator} from './windows';
import {hasSeenOnboardingStorageKey} from './windows/Onboarding';
import ProgressIndicator from './components/ProgressIndicator';
import {ThemeProvider} from './utils/useExpoTheme';
import {Divider, Text, View} from './components';
import {Row, Spacer} from './components/View';
import File05Icon from './assets/icons/file-05.svg';
import Earth02Icon from './assets/icons/earth-02.svg';
import ExpoOrbitIcon from './assets/images/expo-orbit-text.svg';
import {openProjectsSelectorURL} from './utils/constants';

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
  const [selectedDevicesIds, setSelectedDevicesIds] = useState<{
    android?: string;
    ios?: string;
  }>({android: undefined, ios: undefined});

  const [status, setStatus] = useState(Status.LISTENING);
  const [progress, setProgress] = useState(0);

  const {devices} = useListDevices();

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
      let device =
        devices.find(d => getDeviceId(d) === selectedDevicesIds[platform]) ??
        devices[0];
      const deviceId = getDeviceId(device);

      const [buildPath] = await Promise.all([
        await downloadBuildAsync(url, setProgress),
        (async () => {
          if (device.state === 'Shutdown') {
            await bootDeviceAsync({
              platform,
              id: deviceId,
            });
          }
        })(),
      ]);

      setStatus(Status.INSTALLING);
      await installAndLaunchAppAsync({appPath: buildPath, deviceId});
      setStatus(Status.SUCCESS);
    } catch (error) {
      console.log(`error ${error}`);
    } finally {
      setTimeout(() => {
        setStatus(Status.LISTENING);
      }, 2000);
    }
  };

  const openFilePicker = async () => {
    const appPath = await FilePicker.getAppAsync();
    const platform = getPlatformFromURI(appPath);

    const [device] = await listDevicesAsync({platform, oneDevice: true});
    const deviceId = getDeviceId(device);

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

  const onSelectDevice = (device: Device) => {
    const platform = getDeviceOS(device);
    const id = getDeviceId(device);

    setSelectedDevicesIds(prev => {
      return {
        ...prev,
        [platform]: prev[platform] === id ? undefined : id,
      };
    });
  };

  return (
    <AutoResizerRootView style={styles.container} enabled={!props.isDevWindow}>
      <ThemeProvider themePreference="no-preference">
        <View padding="medium" pb="small">
          <ExpoOrbitIcon fill={PlatformColor('text')} />
          <Spacer.Vertical size="small" />
          <Divider />
        </View>
        <View px="medium">
          <Text weight="medium" size="small" color="secondary">
            Build
          </Text>
          {status === Status.LISTENING ? (
            <View>
              <TouchableOpacity onPress={openProjectsSelectorURL}>
                <Row style={{gap: 6}} mt="small" align="center">
                  <File05Icon />
                  <Text>Select build from EAS...</Text>
                </Row>
              </TouchableOpacity>
              <TouchableOpacity onPress={openFilePicker}>
                <Row style={{gap: 6}} mt="small">
                  <Earth02Icon />
                  <Text>Select build from local file...</Text>
                </Row>
              </TouchableOpacity>
            </View>
          ) : status === Status.DOWNLOADING ? (
            <View style={styles.downloading}>
              <ProgressIndicator indeterminate={true} />
              <Text>Downloading build...</Text>
            </View>
          ) : status === Status.INSTALLING ? (
            <View>
              <Text>Installing...</Text>
            </View>
          ) : null}
        </View>
        <View style={{marginTop: 21}}>
          <View px="medium">
            <Text weight="medium" size="small" color="secondary">
              Devices
            </Text>
          </View>
          <View
            overflow="hidden"
            shrink="1"
            style={{marginBottom: 8, marginTop: 4}}>
            <FlatList
              data={devices}
              alwaysBounceVertical={false}
              renderItem={({item: device}) => {
                const platform = getDeviceOS(device);
                const id = getDeviceId(device);

                return (
                  <DeviceItem
                    device={device}
                    key={device.name}
                    onPress={() => onSelectDevice(device)}
                    onPressLaunch={() => {}}
                    selected={selectedDevicesIds[platform] === id}
                  />
                );
              }}
            />
          </View>
        </View>
        <View px="medium" pb="medium">
          <Divider style={{height: 1}} />
          <View py="2">
            <TouchableOpacity onPress={() => WindowsNavigator.open('Settings')}>
              <Text>Settings</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={MenuBarModule.exitApp}>
            <Text>Quit</Text>
          </TouchableOpacity>
        </View>
      </ThemeProvider>
    </AutoResizerRootView>
  );
}

App.defaultProps = {
  isDevWindow: false,
};

export default App;

const styles = StyleSheet.create({
  container: {
    minWidth: 380,
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
    gap: 5,
  },
});
