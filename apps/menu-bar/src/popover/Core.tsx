import { InternalError } from 'common-types';
import { MultipleAppsInTarballErrorDetails } from 'common-types/build/InternalError';
import { Device } from 'common-types/build/devices';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Alert, SectionList } from 'react-native';

import DeviceListSectionHeader from './DeviceListSectionHeader';
import { FOOTER_HEIGHT } from './Footer';
import Item from './Item';
import ProjectsSection, { PROJECTS_SECTION_HEIGHT } from './ProjectsSection';
import SectionHeader, { SECTION_HEADER_HEIGHT } from './SectionHeader';
import { withApolloProvider } from '../api/ApolloClient';
import Earth02Icon from '../assets/icons/earth-02.svg';
import File05Icon from '../assets/icons/file-05.svg';
import { bootDeviceAsync } from '../commands/bootDeviceAsync';
import { downloadBuildAsync } from '../commands/downloadBuildAsync';
import { installAndLaunchAppAsync } from '../commands/installAndLaunchAppAsync';
import { launchSnackAsync } from '../commands/launchSnackAsync';
import { Spacer, Text, View } from '../components';
import DeviceItem, { DEVICE_ITEM_HEIGHT } from '../components/DeviceItem';
import ProgressIndicator from '../components/ProgressIndicator';
import { useDeepLinking } from '../hooks/useDeepLinking';
import { useDeviceAudioPreferences } from '../hooks/useDeviceAudioPreferences';
import { useGetPinnedApps } from '../hooks/useGetPinnedApps';
import { useListDevices } from '../hooks/useListDevices';
import { useSafeDisplayDimensions } from '../hooks/useSafeDisplayDimensions';
import { useFileHandler } from '../modules/FileHandlerModule';
import FilePicker from '../modules/FilePickerModule';
import MenuBarModule from '../modules/MenuBarModule';
import {
  SelectedDevicesIds,
  getSelectedDevicesIds,
  saveSelectedDevicesIds,
} from '../modules/Storage';
import { openProjectsSelectorURL } from '../utils/constants';
import { getDeviceId, getDeviceOS, isVirtualDevice } from '../utils/device';
import { getPlatformFromURI } from '../utils/parseUrl';
import { useExpoTheme } from '../utils/useExpoTheme';

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
  const [selectedDevicesIds, setSelectedDevicesIds] = useState<SelectedDevicesIds>({
    android: undefined,
    ios: undefined,
  });

  const { apps } = useGetPinnedApps();
  const showProjectsSection = Boolean(apps?.length);

  const [status, setStatus] = useState(Status.LISTENING);
  const [progress, setProgress] = useState(0);

  const { devicesPerPlatform, numberOfDevices, sections, refetch } = useListDevices();
  const { emulatorWithoutAudio } = useDeviceAudioPreferences();
  const theme = useExpoTheme();

  // TODO: Extract into a hook
  const displayDimensions = useSafeDisplayDimensions();
  const estimatedAvailableSizeForDevices =
    (displayDimensions.height || 0) -
    FOOTER_HEIGHT -
    BUILDS_SECTION_HEIGHT -
    (showProjectsSection ? PROJECTS_SECTION_HEIGHT : 0) -
    30;
  const heightOfAllDevices =
    DEVICE_ITEM_HEIGHT * numberOfDevices + SECTION_HEADER_HEIGHT * (sections?.length || 0);
  const estimatedListHeight =
    heightOfAllDevices <= estimatedAvailableSizeForDevices || estimatedAvailableSizeForDevices <= 0
      ? heightOfAllDevices
      : estimatedAvailableSizeForDevices;

  useEffect(() => {
    getSelectedDevicesIds().then(setSelectedDevicesIds);
  }, []);

  const getFirstAvailableDevice = useCallback(
    (_?: boolean) => {
      return (
        devicesPerPlatform.ios.devices.find((d) => getDeviceId(d) === selectedDevicesIds.ios) ??
        devicesPerPlatform.android.devices.find(
          (d) => getDeviceId(d) === selectedDevicesIds.android
        ) ??
        devicesPerPlatform.ios.devices?.find((d) => isVirtualDevice(d) && d.state === 'Booted')
      );
    },
    [devicesPerPlatform, selectedDevicesIds]
  );

  const ensureDeviceIsRunning = useCallback(
    async (device: Device) => {
      if (!isVirtualDevice(device) || device.state === 'Booted') {
        return;
      }

      const deviceId = getDeviceId(device);
      await bootDeviceAsync({
        platform: getDeviceOS(device),
        id: deviceId,
        noAudio: emulatorWithoutAudio,
      });
    },
    [emulatorWithoutAudio]
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
    [ensureDeviceIsRunning, getFirstAvailableDevice]
  );

  const getDeviceByPlatform = useCallback(
    (platform: 'android' | 'ios') => {
      const devices: Device[] = devicesPerPlatform[platform].devices;
      return (
        devices.find((d) => getDeviceId(d) === selectedDevicesIds[platform]) ??
        devices.find((d) => getDeviceOS(d) === platform)
      );
    },
    [devicesPerPlatform, selectedDevicesIds]
  );

  const installAppFromURI = useCallback(
    async (appURI: string) => {
      try {
        let localFilePath = appURI.startsWith('/') ? appURI : undefined;
        const platform = getPlatformFromURI(appURI);
        const device = getDeviceByPlatform(platform);
        if (!device) {
          Alert.alert(
            `You don't have any ${platform} device available to run this build, please make your environment is configured correctly and try again.`
          );
          return;
        }

        if (!localFilePath) {
          setStatus(Status.DOWNLOADING);
          const buildPath = await downloadBuildAsync(appURI, setProgress);
          localFilePath = buildPath;
        }

        setStatus(Status.INSTALLING);
        await ensureDeviceIsRunning(device);
        const deviceId = getDeviceId(device);
        try {
          await installAndLaunchAppAsync({ appPath: localFilePath, deviceId });
        } catch (error) {
          if (
            error instanceof InternalError &&
            error.code === 'MULTIPLE_APPS_IN_TARBALL' &&
            error.details
          ) {
            const { apps } = error.details as MultipleAppsInTarballErrorDetails;
            const selectedAppNameIndex = await MenuBarModule.showMultiOptionAlert(
              'Multiple apps where detected in the tarball',
              'Select which app to run:',
              apps.map((app) => app.name)
            );

            await installAndLaunchAppAsync({
              appPath: apps[selectedAppNameIndex].path,
              deviceId,
            });
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          if (__DEV__) {
            console.log('Something went wrong while installing the app.', error.message);
            console.log(`Stack: ${error.stack}`);
          }
          Alert.alert('Something went wrong while installing the app.', error.message);
        }
      } finally {
        setTimeout(() => {
          setStatus(Status.LISTENING);
        }, 2000);
      }
    },
    [ensureDeviceIsRunning, getDeviceByPlatform]
  );

  const openFilePicker = async () => {
    const appPath = await FilePicker.getAppAsync();
    await installAppFromURI(appPath);
  };

  useFileHandler({ onOpenFile: installAppFromURI });

  useDeepLinking(
    useCallback(
      ({ url }) => {
        if (!props.isDevWindow) {
          const urlWithoutProtocol = url.substring(url.indexOf('://') + 3);
          const isSnackUrl = url.includes('exp.host/');

          if (isSnackUrl) {
            return handleSnackUrl(`exp://${urlWithoutProtocol}`);
          }

          installAppFromURI(`https://${urlWithoutProtocol}`);
        }
      },
      [props.isDevWindow, installAppFromURI, handleSnackUrl]
    )
  );

  const onSelectDevice = (device: Device) => {
    const platform = getDeviceOS(device);
    const id = getDeviceId(device);

    setSelectedDevicesIds((prev) => {
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
      <View style={{ height: BUILDS_SECTION_HEIGHT }}>
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
            <Text>{status === Status.DOWNLOADING ? 'Downloading build...' : 'Installing...'}</Text>
          </View>
        ) : null}
      </View>
      {apps?.length ? <ProjectsSection apps={apps} /> : null}
      <View shrink="1" pt="tiny">
        <SectionList
          sections={sections}
          style={{ minHeight: estimatedListHeight }}
          SectionSeparatorComponent={Separator}
          renderSectionHeader={({ section: { label, error } }) => (
            <DeviceListSectionHeader label={label} errorMessage={error?.message} />
          )}
          renderItem={({ item: device }: { item: Device }) => {
            const platform = getDeviceOS(device);
            const id = getDeviceId(device);
            return (
              <DeviceItem
                device={device}
                key={device.name}
                onPress={() => onSelectDevice(device)}
                onPressLaunch={async () => {
                  await bootDeviceAsync({ platform, id });
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

export default memo(withApolloProvider(Core));
