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
import { useFileHandler } from '../../modules/file-handler';
import { Analytics, Event } from '../analytics';
import { withApolloProvider } from '../api/ApolloClient';
import { bootDeviceAsync } from '../commands/bootDeviceAsync';
import { detectIOSAppTypeAsync } from "../commands/detectIOSAppTypeAsync'";
import { downloadBuildAsync } from '../commands/downloadBuildAsync';
import { installAndLaunchAppAsync } from '../commands/installAndLaunchAppAsync';
import { launchExpoGoAsync } from '../commands/launchExpoGoAsync';
import { launchUpdateAsync } from '../commands/launchUpdateAsync';
import { Spacer, View } from '../components';
import DeviceItem, { DEVICE_ITEM_HEIGHT } from '../components/DeviceItem';
import { useDeepLinking } from '../hooks/useDeepLinking';
import { useDeviceAudioPreferences } from '../hooks/useDeviceAudioPreferences';
import { useGetPinnedApps } from '../hooks/useGetPinnedApps';
import { usePopoverFocusEffect } from '../hooks/usePopoverFocus';
import { useSafeDisplayDimensions } from '../hooks/useSafeDisplayDimensions';
import Alert from '../modules/Alert';
import MenuBarModule from '../modules/MenuBarModule';
import {
  SelectedDevicesIds,
  getSelectedDevicesIds,
  saveSelectedDevicesIds,
  sessionSecretStorageKey,
  storage,
} from '../modules/Storage';
import { useListDevices } from '../providers/DevicesProvider';
import { getDeviceId, getDeviceOS, isVirtualDevice } from '../utils/device';
import { MenuBarStatus, Task } from '../utils/helpers';
import {
  URLType,
  getPlatformFromURI,
  handleAuthUrl,
  identifyAndParseDeeplinkURL,
} from '../utils/parseUrl';
import { WindowsNavigator } from '../windows';

type Props = {
  isDevWindow: boolean;
};

function Core(props: Props) {
  const [selectedDevicesIds, setSelectedDevicesIds] =
    useState<SelectedDevicesIds>(getSelectedDevicesIds());

  const { apps, refetch: refetchApps } = useGetPinnedApps();
  usePopoverFocusEffect(
    useCallback(() => {
      refetchApps();
    }, [refetchApps])
  );

  const [tasks, setTasks] = useState<Map<string, Task>>(new Map());
  const createTask = useCallback(
    (props: Task) => {
      setTasks((prevMap) => {
        const newMap = new Map(prevMap);
        newMap.set(props.id, props);
        return newMap;
      });
    },
    [setTasks]
  );
  const updateTask = useCallback(
    (props: Partial<Task> & Pick<Task, 'id'>) => {
      setTasks((prevMap) => {
        const newMap = new Map(prevMap);
        const item = newMap.get(props.id);
        if (item) {
          newMap.set(props.id, { ...item, ...props });
        }
        return newMap;
      });
    },
    [setTasks]
  );
  const deleteTask = useCallback(
    (id: Task['id']) => {
      setTasks((prevMap) => {
        const newMap = new Map(prevMap);
        newMap.delete(id);
        return newMap;
      });
    },
    [setTasks]
  );

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

  const getAvailableDeviceForExpoGo = useCallback(() => {
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
      Alert.alert("You don't have any device available to run Expo Go. Please check your setup.");
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
    (platform: 'android' | 'ios', deviceType?: Device['deviceType']) => {
      const devices = devicesPerPlatform[platform].devices;
      const selectedDevicesId = selectedDevicesIds[platform];
      if (selectedDevicesId && devices.has(selectedDevicesId)) {
        const device = devices.get(selectedDevicesId);
        if (!deviceType || device?.deviceType === deviceType) {
          return devices.get(selectedDevicesId);
        }
      }

      for (const device of devices.values()) {
        if (
          (deviceType === 'device' && device.deviceType === deviceType) ||
          (deviceType !== 'device' && isVirtualDevice(device) && device.state === 'Booted')
        ) {
          setSelectedDevicesIds((prev) => ({ ...prev, [platform]: getDeviceId(device) }));
          return device;
        }
      }

      const firstDevice = [...devices.values()].find(
        (d) => !deviceType || d.deviceType === deviceType
      );
      if (!firstDevice) {
        return;
      }

      setSelectedDevicesIds((prev) => ({ ...prev, [platform]: getDeviceId(firstDevice) }));
      return firstDevice;
    },
    [devicesPerPlatform, selectedDevicesIds]
  );

  const handleExpoGoUrl = useCallback(
    async (url: string, sdkVersion?: string | null) => {
      const device = getAvailableDeviceForExpoGo();
      if (!device) {
        return;
      }

      try {
        createTask({
          id: url,
          status: MenuBarStatus.BOOTING_DEVICE,
          progress: 0,
        });
        await ensureDeviceIsRunning(device);
        updateTask({ id: url, status: MenuBarStatus.OPENING_PROJECT_IN_EXPO_GO });
        await launchExpoGoAsync({
          url,
          deviceId: getDeviceId(device),
          platform: getDeviceOS(device),
          sdkVersion,
        });
      } catch (error) {
        if (error instanceof InternalError) {
          Alert.alert('Something went wrong', error.message);
        }
        console.log(`error: ${JSON.stringify(error)}`);
      } finally {
        setTimeout(() => {
          deleteTask(url);
        }, 2000);
      }
    },
    [ensureDeviceIsRunning, getAvailableDeviceForExpoGo, createTask, deleteTask, updateTask]
  );

  const handleUpdateUrl = useCallback(
    async (url: string) => {
      if (!storage.getString(sessionSecretStorageKey)) {
        Alert.alert(
          'You need to be logged in to launch updates.',
          'Log in through the Settings window and try again.'
        );
        return;
      }
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
          `You don't have any ${platform} devices available to open this update, please make sure your environment is configured correctly and try again.`
        );
        return;
      }

      try {
        createTask({
          id: url,
          status: MenuBarStatus.BOOTING_DEVICE,
          progress: 0,
        });
        await ensureDeviceIsRunning(device);
        updateTask({ id: url, status: MenuBarStatus.OPENING_UPDATE });
        await launchUpdateAsync(
          {
            url,
            deviceId: getDeviceId(device),
            platform: getDeviceOS(device),
          },
          (status, progress) => {
            updateTask({
              id: url,
              status,
              progress: status === MenuBarStatus.DOWNLOADING ? progress : 0,
            });
          }
        );
      } catch (error) {
        if (error instanceof Error) {
          if (error instanceof InternalError && error.code === 'NO_DEVELOPMENT_BUILDS_AVAILABLE') {
            Alert.alert(
              'Unable to find a compatible development build',
              `${error.message} Either create a new development build with EAS Build or, if the app is already installed on the target device and uses the correct runtime version, you can launch the update using a deep link.`,
              [
                { text: 'OK', onPress: () => {} },
                {
                  text: 'Launch with deep link',
                  onPress: async () => {
                    updateTask({ id: url, status: MenuBarStatus.OPENING_UPDATE });
                    await launchUpdateAsync(
                      {
                        url,
                        deviceId: getDeviceId(device),
                        platform: getDeviceOS(device),
                        noInstall: true,
                      },
                      (status) => {
                        updateTask({ id: url, status });
                      }
                    );
                    setTimeout(() => {
                      deleteTask(url);
                    }, 2000);
                  },
                },
                {
                  text: 'Launch with Expo Go',
                  onPress: async () => {
                    updateTask({ id: url, status: MenuBarStatus.OPENING_UPDATE });
                    await launchUpdateAsync(
                      {
                        url,
                        deviceId: getDeviceId(device),
                        platform: getDeviceOS(device),
                        forceExpoGo: true,
                      },
                      (status) => {
                        updateTask({ id: url, status });
                      }
                    );
                    setTimeout(() => {
                      deleteTask(url);
                    }, 2000);
                  },
                },
              ]
            );
          } else {
            Alert.alert('Something went wrong', error.message);
          }
        }
        console.log(`error: ${JSON.stringify(error)}`);
      } finally {
        setTimeout(() => {
          deleteTask(url);
        }, 2000);
      }
    },
    [ensureDeviceIsRunning, getDeviceByPlatform, createTask, deleteTask, updateTask]
  );

  const installAppFromURI = useCallback(
    async (appURI: string) => {
      if (tasks.has(appURI)) {
        return;
      }

      let localFilePath = appURI.startsWith('https://') ? undefined : appURI;

      try {
        if (!localFilePath) {
          createTask({
            id: appURI,
            status: MenuBarStatus.DOWNLOADING,
            progress: 0,
          });
          const buildPath = await downloadBuildAsync(appURI, (progress) => {
            updateTask({ id: appURI, progress });
          });
          localFilePath = buildPath;
        }

        const platform = getPlatformFromURI(appURI);

        let appType: Device['deviceType'] | undefined;
        if (platform === 'ios') {
          appType = await detectIOSAppTypeAsync(localFilePath);
        }

        const device = getDeviceByPlatform(platform, appType);
        if (!device) {
          Alert.alert(
            `You don't have any ${platform} device available to run this build, please make sure your environment is configured correctly and try again.`
          );
          return;
        }
        const deviceId = getDeviceId(device);

        if (tasks.get(appURI)) {
          updateTask({ id: appURI, status: MenuBarStatus.BOOTING_DEVICE });
        } else {
          createTask({
            id: appURI,
            status: MenuBarStatus.BOOTING_DEVICE,
            progress: 0,
          });
        }
        await ensureDeviceIsRunning(device);

        try {
          updateTask({ id: appURI, status: MenuBarStatus.INSTALLING_APP });
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
        }
        if (error instanceof InternalError && error.code === 'UNTRUSTED_SOURCE') {
          Alert.alert(
            'Untrusted source',
            `${error.message}\n\nYou add custom trusted sources through the Settings window.`,
            [
              { text: 'OK', style: 'default' },
              { text: 'Open Settings', onPress: () => WindowsNavigator.open('Settings') },
            ]
          );
        } else if (error instanceof Error) {
          if (__DEV__) {
            console.log('Something went wrong while installing the app.', error.message);
            console.log(`Stack: ${error.stack}`);
          }
          Alert.alert('Something went wrong while installing the app.', error.message);
        }
      } finally {
        setTimeout(() => {
          deleteTask(appURI);
        }, 2000);
      }
    },
    [ensureDeviceIsRunning, getDeviceByPlatform, createTask, deleteTask, updateTask, tasks]
  );

  useFileHandler({ onOpenFile: installAppFromURI });

  useDeepLinking(
    useCallback(
      ({ url: deeplinkUrl }) => {
        if (!props.isDevWindow) {
          try {
            const deeplinkInfo = identifyAndParseDeeplinkURL(deeplinkUrl);
            const { urlType, url } = deeplinkInfo;

            switch (urlType) {
              case URLType.AUTH:
                handleAuthUrl(url);
                break;
              case URLType.GO:
                Analytics.track(Event.LAUNCH_EXPO_GO);
                handleExpoGoUrl(url, deeplinkInfo.sdkVersion);
                break;
              case URLType.SNACK:
                Analytics.track(Event.LAUNCH_SNACK);
                handleExpoGoUrl(url);
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
      [props.isDevWindow, handleExpoGoUrl, handleUpdateUrl, installAppFromURI]
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
      <BuildsSection installAppFromURI={installAppFromURI} tasks={tasks} />
      <ProjectsSection apps={apps} />
      <View shrink="1" pt="tiny" overflow="hidden">
        {devicesError ? (
          <DevicesListError error={devicesError} />
        ) : (
          <SectionList
            sections={sections}
            style={{ minHeight: estimatedListHeight }}
            contentContainerStyle={{ width: '100%' }}
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
                    Analytics.track(Event.LAUNCH_SIMULATOR);
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
