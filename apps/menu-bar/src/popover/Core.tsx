import React, {useCallback, useEffect, useState} from 'react';
import {FlatList} from 'react-native';

import {useDeepLinking} from '../hooks/useDeepLinking';
import {downloadBuildAsync} from '../commands/downloadBuildAsync';
import {useListDevices} from '../hooks/useListDevices';
import {bootDeviceAsync} from '../commands/bootDeviceAsync';
import {installAndLaunchAppAsync} from '../commands/installAndLaunchAppAsync';
import {launchSnackAsync} from '../commands/launchSnackAsync';
import FilePicker from '../modules/FilePickerModule';
import {getPlatformFromURI} from '../utils/parseUrl';
import DeviceItem from '../components/DeviceItem';
import {Device, getDeviceId, getDeviceOS} from '../utils/device';
import ProgressIndicator from '../components/ProgressIndicator';
import {Text, View} from '../components';
import File05Icon from '../assets/icons/file-05.svg';
import Earth02Icon from '../assets/icons/earth-02.svg';
import {openProjectsSelectorURL} from '../utils/constants';
import {
  SelectedDevicesIds,
  getSelectedDevicesIds,
  saveSelectedDevicesIds,
} from '../modules/Storage';
import {useDeviceAudioPreferences} from '../hooks/useDeviceAudioPreferences';
import {useExpoTheme} from '../utils/useExpoTheme';
import SectionHeader from './SectionHeader';
import Item from './Item';

enum Status {
  LISTENING,
  DOWNLOADING,
  INSTALLING,
}

type Props = {
  isDevWindow: boolean;
};

function Core(props: Props) {
  const [selectedDevicesIds, setSelectedDevicesIds] =
    useState<SelectedDevicesIds>({android: undefined, ios: undefined});

  const [status, setStatus] = useState(Status.LISTENING);
  const [progress, setProgress] = useState(0);

  const {devices} = useListDevices();
  const {emulatorWithoutAudio} = useDeviceAudioPreferences();
  const theme = useExpoTheme();

  useEffect(() => {
    getSelectedDevicesIds().then(setSelectedDevicesIds);
  }, []);

  const getFirstAvailableDevice = useCallback(
    (simulator?: boolean) => {
      return (
        devices.find(d => getDeviceId(d) === selectedDevicesIds.ios) ??
        devices.find(d => getDeviceId(d) === selectedDevicesIds.android) ??
        devices?.find(d => d.state === 'Booted')
      );
    },
    [devices, selectedDevicesIds],
  );

  const ensureDeviceIsRunning = useCallback(
    async (device: Device) => {
      if (device.state !== 'Shutdown') {
        return;
      }

      const deviceId = getDeviceId(device);
      await bootDeviceAsync({
        platform: getDeviceOS(device),
        id: deviceId,
        noAudio: emulatorWithoutAudio,
      });
    },
    [emulatorWithoutAudio],
  );

  // @TODO: create another hook
  const handleSnackUrl = useCallback(
    async (url: string) => {
      const device = getFirstAvailableDevice();
      if (!device) {
        return;
      }

      ensureDeviceIsRunning(device);
      await launchSnackAsync({
        url,
        deviceId: getDeviceId(device),
        platform: getDeviceOS(device),
      });
    },
    [ensureDeviceIsRunning, getFirstAvailableDevice],
  );

  const getDeviceByPlatform = useCallback(
    (platform: 'android' | 'ios') => {
      return (
        devices.find(d => getDeviceId(d) === selectedDevicesIds[platform]) ??
        devices.find(d => getDeviceOS(d) === platform)
      );
    },
    [devices, selectedDevicesIds],
  );

  const handleEASUrl = useCallback(
    async (url: string) => {
      try {
        const platform = getPlatformFromURI(url);
        let device = getDeviceByPlatform(platform);
        if (!device) {
          return; // handle error
        }

        const deviceId = getDeviceId(device);
        setStatus(Status.DOWNLOADING);
        const [buildPath] = await Promise.all([
          downloadBuildAsync(url, setProgress),
          ensureDeviceIsRunning(device),
        ]);

        setStatus(Status.INSTALLING);
        await installAndLaunchAppAsync({appPath: buildPath, deviceId});
      } catch (error) {
        console.log(`error ${error}`);
      } finally {
        setTimeout(() => {
          setStatus(Status.LISTENING);
        }, 2000);
      }
    },
    [ensureDeviceIsRunning, getDeviceByPlatform],
  );

  const openFilePicker = async () => {
    try {
      const appPath = await FilePicker.getAppAsync();
      const platform = getPlatformFromURI(appPath);

      const device = getDeviceByPlatform(platform);
      if (!device) {
        return; // handle error
      }

      await ensureDeviceIsRunning(device);

      const deviceId = getDeviceId(device);
      setStatus(Status.INSTALLING);
      await installAndLaunchAppAsync({
        appPath,
        deviceId,
      });
    } catch (error) {
    } finally {
      setTimeout(() => {
        setStatus(Status.LISTENING);
      }, 2000);
    }
  };

  useDeepLinking(
    useCallback(
      ({url}) => {
        if (!props.isDevWindow) {
          const urlWithoutProtocol = url.substring(url.indexOf('://') + 3);
          const isSnackUrl = url.includes('exp.host/');

          if (isSnackUrl) {
            return handleSnackUrl(`exp://${urlWithoutProtocol}`);
          }

          handleEASUrl(`https://${urlWithoutProtocol}`);
        }
      },
      [props.isDevWindow, handleEASUrl, handleSnackUrl],
    ),
  );

  const onSelectDevice = (device: Device) => {
    const platform = getDeviceOS(device);
    const id = getDeviceId(device);

    setSelectedDevicesIds(prev => {
      const newValue = {
        ...prev,
        [platform]: prev[platform] === id ? undefined : id,
      };

      saveSelectedDevicesIds(newValue);
      return newValue;
    });
  };

  return (
    <View>
      <View px="medium" pb="tiny">
        <SectionHeader label="Builds" />
      </View>
      {status === Status.LISTENING ? (
        <>
          <Item onPress={openProjectsSelectorURL}>
            <Earth02Icon stroke={theme.text.default} />
            <Text>Select build from EAS…</Text>
          </Item>
          <Item onPress={openFilePicker}>
            <File05Icon stroke={theme.text.default} />
            <Text>Select build from local file…</Text>
          </Item>
        </>
      ) : status === Status.DOWNLOADING || status === Status.INSTALLING ? (
        <View px="medium">
          <ProgressIndicator
            progress={status === Status.DOWNLOADING ? progress : undefined}
            indeterminate={status === Status.INSTALLING ? true : undefined}
            key={status}
          />
          <Text>
            {status === Status.DOWNLOADING
              ? 'Downloading build...'
              : 'Installing...'}
          </Text>
        </View>
      ) : null}
      <View shrink="1" overflow="hidden" pt="tiny">
        <View px="medium">
          <SectionHeader label="Devices" />
        </View>
        <View overflow="hidden" shrink="1" mb="tiny" mt="tiny">
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
                  onPressLaunch={() =>
                    bootDeviceAsync({
                      platform,
                      id,
                      noAudio: emulatorWithoutAudio,
                    })
                  }
                  selected={selectedDevicesIds[platform] === id}
                />
              );
            }}
          />
        </View>
      </View>
    </View>
  );
}

export default Core;
