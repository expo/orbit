import React, {memo, useCallback, useEffect, useState} from 'react';
import {Alert, SectionList} from 'react-native';

import {useDeepLinking} from '../hooks/useDeepLinking';
import {downloadBuildAsync} from '../commands/downloadBuildAsync';
import {useListDevices} from '../hooks/useListDevices';
import {bootDeviceAsync} from '../commands/bootDeviceAsync';
import {installAndLaunchAppAsync} from '../commands/installAndLaunchAppAsync';
import {launchSnackAsync} from '../commands/launchSnackAsync';
import FilePicker from '../modules/FilePickerModule';
import {getPlatformFromURI} from '../utils/parseUrl';
import DeviceItem, {DEVICE_ITEM_HEIGHT} from '../components/DeviceItem';
import {
  Device,
  getDeviceId,
  getDeviceOS,
  getSectionsFromDeviceList,
} from '../utils/device';
import ProgressIndicator from '../components/ProgressIndicator';
import {Spacer, Text, View} from '../components';
import File05Icon from '../assets/icons/file-05.svg';
import Earth02Icon from '../assets/icons/earth-02.svg';
import {openProjectsSelectorURL} from '../utils/constants';
import {
  SelectedDevicesIds,
  getSelectedDevicesIds,
  saveSelectedDevicesIds,
} from '../modules/Storage';
import {useDeviceAudioPreferences} from '../hooks/useDeviceAudioPreferences';
import {useSafeDisplayDimensions} from '../hooks/useSafeDisplayDimensions';
import {useExpoTheme} from '../utils/useExpoTheme';
import SectionHeader, {SECTION_HEADER_HEIGHT} from './SectionHeader';
import Item from './Item';
import {FOOTER_HEIGHT} from './Footer';

enum Status {
  LISTENING,
  DOWNLOADING,
  INSTALLING,
}

const BUILDS_SECTION_HEIGHT = 88;

type Props = {
  isDevWindow: boolean;
};

function Core(props: Props) {
  const [selectedDevicesIds, setSelectedDevicesIds] =
    useState<SelectedDevicesIds>({android: undefined, ios: undefined});

  const [status, setStatus] = useState(Status.LISTENING);
  const [progress, setProgress] = useState(0);

  const {devices, refetch} = useListDevices();
  const {emulatorWithoutAudio} = useDeviceAudioPreferences();
  const theme = useExpoTheme();

  const sections = getSectionsFromDeviceList(devices);

  const displayDimensions = useSafeDisplayDimensions();
  const estimatedAvailableSizeForDevices =
    (displayDimensions.height || 0) -
    FOOTER_HEIGHT -
    BUILDS_SECTION_HEIGHT -
    30;
  const heightOfAllDevices =
    DEVICE_ITEM_HEIGHT * devices?.length +
    SECTION_HEADER_HEIGHT * (sections?.length || 0);
  const estimatedListHeight =
    heightOfAllDevices <= estimatedAvailableSizeForDevices ||
    estimatedAvailableSizeForDevices <= 0
      ? heightOfAllDevices
      : estimatedAvailableSizeForDevices;

  useEffect(() => {
    getSelectedDevicesIds().then(setSelectedDevicesIds);
  }, []);

  const getFirstAvailableDevice = useCallback(
    (_?: boolean) => {
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
          Alert.alert(
            `You don't have any ${platform} device available to run this build, please make your environment is configured correctly and try again.`,
          );
          return;
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
    <View shrink="1">
      <View style={{height: BUILDS_SECTION_HEIGHT}}>
        <View pt="2.5" pb="tiny">
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
              indeterminate={status === Status.INSTALLING}
              key={status}
            />
            <Text>
              {status === Status.DOWNLOADING
                ? 'Downloading build...'
                : 'Installing...'}
            </Text>
          </View>
        ) : null}
      </View>
      <View shrink="1" pt="tiny">
        <SectionList
          sections={sections}
          style={{minHeight: estimatedListHeight}}
          SectionSeparatorComponent={Separator}
          renderSectionHeader={({section: {label}}) => (
            <SectionHeader label={label} />
          )}
          renderItem={({item: device}: {item: Device}) => {
            const platform = getDeviceOS(device);
            const id = getDeviceId(device);
            return (
              <DeviceItem
                device={device}
                key={device.name}
                onPress={() => onSelectDevice(device)}
                onPressLaunch={async () => {
                  await bootDeviceAsync({platform, id});
                  refetch();
                }}
                selected={selectedDevicesIds[platform] === id}
              />
            );
          }}
        />
      </View>
    </View>
  );
}

const Separator = () => <Spacer.Vertical size="tiny" />;

export default memo(Core);
