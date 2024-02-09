import { InternalError } from 'common-types';
import { MultipleAppsInTarballErrorDetails } from 'common-types/build/InternalError';
import { Device } from 'common-types/build/devices';
import React, { memo, useCallback, useState } from 'react';
import { SectionList } from 'react-native';

import BuildsSection, { BUILDS_SECTION_HEIGHT } from './BuildsSection';
import DeviceListSectionHeader from './DeviceListSectionHeader';
import DevicesListError from './DevicesListError';
import { FOOTER_HEIGHT } from './Footer';
import ProjectsSection, { getProjectSectionHeight } from './ProjectsSection';
import { SECTION_HEADER_HEIGHT } from './SectionHeader';
import { Analytics, Event } from '../analytics';
import { withApolloProvider } from '../api/ApolloClient';
import { bootDeviceAsync } from '../commands/bootDeviceAsync';
import { downloadBuildAsync } from '../commands/downloadBuildAsync';
import { installAndLaunchAppAsync } from '../commands/installAndLaunchAppAsync';
import { launchSnackAsync } from '../commands/launchSnackAsync';
import { launchUpdateAsync } from '../commands/launchUpdateAsync';
import { Spacer, View } from '../components';
import DeviceItem, { DEVICE_ITEM_HEIGHT } from '../components/DeviceItem';
import { useDeepLinking } from '../hooks/useDeepLinking';
import { useDeviceAudioPreferences } from '../hooks/useDeviceAudioPreferences';
import { useGetPinnedApps } from '../hooks/useGetPinnedApps';
import { usePopoverFocusEffect } from '../hooks/usePopoverFocus';
import { useSafeDisplayDimensions } from '../hooks/useSafeDisplayDimensions';
import Alert from '../modules/Alert';
import { useFileHandler } from '../modules/FileHandlerModule';
import MenuBarModule from '../modules/MenuBarModule';
import {
  SelectedDevicesIds,
  getSelectedDevicesIds,
  saveSelectedDevicesIds,
} from '../modules/Storage';
import { useListDevices } from '../providers/DevicesProvider';
import { getDeviceId, getDeviceOS, isVirtualDevice } from '../utils/device';
import { MenuBarStatus } from '../utils/helpers';
import {
  URLType,
  getPlatformFromURI,
  handleAuthUrl,
  identifyAndParseDeeplinkURL,
} from '../utils/parseUrl';

type Props = {
  isDevWindow: boolean;
};

function Core(props: Props) {
  const [selectedDevicesIds, setSelectedDevicesIds] = useState<SelectedDevicesIds>(
    getSelectedDevicesIds()
  );

  const { apps, refetch: refetchApps } = useGetPinnedApps();
  usePopoverFocusEffect(
    useCallback(() => {
      refetchApps();
    }, [refetchApps])
  );

  const [status, setStatus] = useState(MenuBarStatus.LISTENING);
  const [progress, setProgress] = useState(0);

  const {
    devicesPerPlatform,
    numberOfDevices,
    sections,
    refetch,
    error: devicesError,
  } = useListDevices();
  usePopoverFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );
  const { emulatorWithoutAudio } = useDeviceAudioPreferences();

  // TODO: Extract into a hook
  const displayDimensions = useSafeDisplayDimensions();
  const estimatedAvailableSizeForDevices =
    (displayDimensions.height || 0) -
    FOOTER_HEIGHT -
    BUILDS_SECTION_HEIGHT -
    getProjectSectionHeight(apps?.length) -
    5;
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

  const getDeviceByPlatform = useCallback(
    (platform: 'android' | 'ios') => {
      const devices = devicesPerPlatform[platform].devices;
      const selectedDevicesId = selectedDevicesIds[platform];
      if (selectedDevicesId && devices.has(selectedDevicesId)) {
        return devices.get(selectedDevicesId);
      }

      for (const device of devices.values()) {
        if (isVirtualDevice(device) && device.state === 'Booted') {
          setSelectedDevicesIds((prev) => ({ ...prev, [platform]: getDeviceId(device) }));
          return device;
        }
      }

      const [firstDevice] = devices.values();
      if (!firstDevice) {
        return;
      }

      setSelectedDevicesIds((prev) => ({ ...prev, [platform]: getDeviceId(firstDevice) }));
      return firstDevice;
    },
    [devicesPerPlatform, selectedDevicesIds]
  );

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

  const handleUpdateUrl = useCallback(
    async (url: string) => {
      /**
       * Supports any update manifest url as long as the
       * platform is specified in the query params.
       */
      const platform = new URL(url).searchParams.get('platform');
      if (platform !== 'android' && platform !== 'ios') {
        Alert.alert(
          `Update URLs must include the "platform" query parameter with a value of either 'android' or 'ios'.`
        );
        return;
      }

      const device = getDeviceByPlatform(platform);
      if (!device) {
        Alert.alert(
          `You don't have any ${platform} devices available to open this update, please make your environment is configured correctly and try again.`
        );
        return;
      }

      try {
        setStatus(MenuBarStatus.BOOTING_DEVICE);
        await ensureDeviceIsRunning(device);
        await launchUpdateAsync(
          {
            url,
            deviceId: getDeviceId(device),
            platform: getDeviceOS(device),
          },
          (status, progress) => {
            setStatus(status);
            if (status === MenuBarStatus.DOWNLOADING) {
              setProgress(progress);
            }
          }
        );
      } catch (error) {
        if (error instanceof InternalError || error instanceof Error) {
          Alert.alert('Something went wrong', error.message);
        }
        console.log(`error: ${JSON.stringify(error)}`);
      } finally {
        setTimeout(() => {
          setStatus(MenuBarStatus.LISTENING);
        }, 2000);
      }
    },
    [ensureDeviceIsRunning, getDeviceByPlatform]
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
                'Confirm that this is an internal distribution build and that your device was provisioned to use this build.'
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
      ({ url: deeplinkUrl }) => {
        if (!props.isDevWindow) {
          try {
            const { urlType, url } = identifyAndParseDeeplinkURL(deeplinkUrl);

            switch (urlType) {
              case URLType.AUTH:
                handleAuthUrl(url);
                break;
              case URLType.SNACK:
                Analytics.track(Event.LAUNCH_SNACK);
                handleSnackUrl(url);
                break;
              case URLType.EXPO_UPDATE:
                Analytics.track(Event.LAUNCH_EXPO_UPDATE);
                handleUpdateUrl(url);
                break;
              case URLType.EXPO_BUILD:
              case URLType.UNKNOWN:
              default:
                Analytics.track(Event.LAUNCH_BUILD);
                installAppFromURI(url);
                break;
            }
          } catch (error) {
            if (error instanceof Error) {
              Alert.alert('Unsupported URL', error.message);
            }
          }
        }
      },
      [props.isDevWindow, handleSnackUrl, handleUpdateUrl, installAppFromURI]
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
      <ProjectsSection apps={apps} />
      <View shrink="1" pt="tiny" overflow="hidden">
        {devicesError ? (
          <DevicesListError error={devicesError} />
        ) : (
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
        )}
      </View>
    </View>
  );
}

const Separator = () => <Spacer.Vertical size="tiny" />;

export default memo(withApolloProvider(Core));
