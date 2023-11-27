import { InternalError } from 'common-types';
import { MultipleAppsInTarballErrorDetails } from 'common-types/build/InternalError';
import { Device } from 'common-types/build/devices';
import React, { memo, useCallback, useState } from 'react';
import { Alert, SectionList } from 'react-native';

import BuildsSection, { BUILDS_SECTION_HEIGHT } from './BuildsSection';
import DeviceListSectionHeader from './DeviceListSectionHeader';
import { FOOTER_HEIGHT } from './Footer';
import ProjectsSection, { PROJECTS_SECTION_HEIGHT } from './ProjectsSection';
import { SECTION_HEADER_HEIGHT } from './SectionHeader';
import { withApolloProvider } from '../api/ApolloClient';
import { bootDeviceAsync } from '../commands/bootDeviceAsync';
import { downloadBuildAsync } from '../commands/downloadBuildAsync';
import { installAndLaunchAppAsync } from '../commands/installAndLaunchAppAsync';
import { launchSnackAsync } from '../commands/launchSnackAsync';
import { Spacer, View } from '../components';
import DeviceItem, { DEVICE_ITEM_HEIGHT } from '../components/DeviceItem';
import { useDeepLinking } from '../hooks/useDeepLinking';
import { useDeviceAudioPreferences } from '../hooks/useDeviceAudioPreferences';
import { useGetPinnedApps } from '../hooks/useGetPinnedApps';
import { useListDevices } from '../hooks/useListDevices';
import { usePopoverFocusEffect } from '../hooks/usePopoverFocus';
import { useSafeDisplayDimensions } from '../hooks/useSafeDisplayDimensions';
import { useFileHandler } from '../modules/FileHandlerModule';
import MenuBarModule from '../modules/MenuBarModule';
import {
  SelectedDevicesIds,
  getSelectedDevicesIds,
  saveSelectedDevicesIds,
} from '../modules/Storage';
import { getDeviceId, getDeviceOS, isVirtualDevice } from '../utils/device';
import { MenuBarStatus } from '../utils/helpers';
import { getPlatformFromURI, handleAuthUrl } from '../utils/parseUrl';

type Props = {
  isDevWindow: boolean;
};

function Core(props: Props) {
  const [selectedDevicesIds, setSelectedDevicesIds] = useState<SelectedDevicesIds>(
    getSelectedDevicesIds()
  );

  const { apps, refetch: refetchApps } = useGetPinnedApps();
  usePopoverFocusEffect(refetchApps);

  const showProjectsSection = Boolean(apps?.length);

  const [status, setStatus] = useState(MenuBarStatus.LISTENING);
  const [progress, setProgress] = useState(0);

  const { devicesPerPlatform, numberOfDevices, sections, refetch } = useListDevices();
  const { emulatorWithoutAudio } = useDeviceAudioPreferences();

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

  const getAvailableDeviceForSnack = useCallback(() => {
    const selectedIosDevice = devicesPerPlatform.ios.devices.get(selectedDevicesIds.ios ?? '');
    const selectedAndroidDevice = devicesPerPlatform.android.devices.get(
      selectedDevicesIds.android ?? ''
    );

    if (selectedIosDevice || selectedAndroidDevice) {
      return selectedIosDevice ?? selectedAndroidDevice;
    }

    const iosDevicesArray = Array.from(devicesPerPlatform.ios.devices.values());
    const androidDevicesArray = Array.from(devicesPerPlatform.android.devices.values());

    const bootedIosDevice = iosDevicesArray?.find(
      (d) => isVirtualDevice(d) && d.state === 'Booted'
    );
    const bootedAndroidDevice = androidDevicesArray?.find(
      (d) => isVirtualDevice(d) && d.state === 'Booted'
    );

    const fistDeviceAvailable = iosDevicesArray?.[0] ?? androidDevicesArray?.[0];

    const device = bootedIosDevice ?? bootedAndroidDevice ?? fistDeviceAvailable;

    if (!device) {
      Alert.alert("You don't have any device available to run Snack. Please check your setup.");
      return;
    }

    setSelectedDevicesIds((prev) => {
      const platform = getDeviceOS(device);
      return { ...prev, [platform]: getDeviceId(device) };
    });

    return device;
  }, [devicesPerPlatform, selectedDevicesIds]);

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
      const device = getAvailableDeviceForSnack();
      if (!device) {
        return;
      }

      try {
        setStatus(MenuBarStatus.BOOTING_DEVICE);
        await ensureDeviceIsRunning(device);
        setStatus(MenuBarStatus.OPENING_SNACK_PROJECT);
        await launchSnackAsync({
          url,
          deviceId: getDeviceId(device),
          platform: getDeviceOS(device),
        });
      } catch (error) {
        if (error instanceof InternalError) {
          Alert.alert('Something went wrong', error.message);
        }
        console.log(`error: ${JSON.stringify(error)}`);
      } finally {
        setTimeout(() => {
          setStatus(MenuBarStatus.LISTENING);
        }, 2000);
      }
    },
    [ensureDeviceIsRunning, getAvailableDeviceForSnack]
  );

  const getDeviceByPlatform = useCallback(
    (platform: 'android' | 'ios') => {
      const selectedDevicesId = selectedDevicesIds[platform];
      if (selectedDevicesId) {
        return devicesPerPlatform[platform].devices.get(selectedDevicesId);
      }

      const [firstDevice] = devicesPerPlatform[platform].devices.values();
      if (!firstDevice) {
        return;
      }

      setSelectedDevicesIds((prev) => ({ ...prev, [platform]: getDeviceId(firstDevice) }));
      return firstDevice;
    },
    [devicesPerPlatform, selectedDevicesIds]
  );

  const installAppFromURI = useCallback(
    async (appURI: string) => {
      let localFilePath = appURI.startsWith('/') ? appURI : undefined;
      try {
        if (!localFilePath) {
          setStatus(MenuBarStatus.DOWNLOADING);
          const buildPath = await downloadBuildAsync(appURI, setProgress);
          localFilePath = buildPath;
        }

        const platform = getPlatformFromURI(appURI);
        const device = getDeviceByPlatform(platform);
        if (!device) {
          Alert.alert(
            `You don't have any ${platform} device available to run this build, please make your environment is configured correctly and try again.`
          );
          return;
        }
        const deviceId = getDeviceId(device);

        setStatus(MenuBarStatus.BOOTING_DEVICE);
        await ensureDeviceIsRunning(device);

        try {
          setStatus(MenuBarStatus.INSTALLING_APP);
          await installAndLaunchAppAsync({ appPath: localFilePath, deviceId });
        } catch (error) {
          if (error instanceof InternalError) {
            if (error.code === 'APPLE_DEVICE_LOCKED') {
              Alert.alert(
                'Please unlock your device and open the app manually',
                'We were unable to launch your app because the device is currently locked.'
              );
            } else if (error.code === 'APPLE_APP_VERIFICATION_FAILED') {
              Alert.alert(
                error.message,
                'A valid provisioning profile for this executable was not found. Is this an internal distribution build?'
              );
            }
          } else {
            throw error;
          }
        }
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

          await installAppFromURI(apps[selectedAppNameIndex].path);
        } else if (error instanceof Error) {
          if (__DEV__) {
            console.log('Something went wrong while installing the app.', error.message);
            console.log(`Stack: ${error.stack}`);
          }
          Alert.alert('Something went wrong while installing the app.', error.message);
        }
      } finally {
        setTimeout(() => {
          setStatus(MenuBarStatus.LISTENING);
        }, 2000);
      }
    },
    [ensureDeviceIsRunning, getDeviceByPlatform]
  );

  useFileHandler({ onOpenFile: installAppFromURI });

  useDeepLinking(
    useCallback(
      ({ url }) => {
        if (!props.isDevWindow) {
          const urlWithoutProtocol = url.substring(url.indexOf('://') + 3);
          const isSnackUrl = url.includes('exp.host/');
          const isAuthUrl = urlWithoutProtocol.startsWith('auth?');

          if (isAuthUrl) {
            handleAuthUrl(url);
          } else if (isSnackUrl) {
            handleSnackUrl(`exp://${urlWithoutProtocol}`);
          } else {
            installAppFromURI(`https://${urlWithoutProtocol}`);
          }
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
      <BuildsSection status={status} installAppFromURI={installAppFromURI} progress={progress} />
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
