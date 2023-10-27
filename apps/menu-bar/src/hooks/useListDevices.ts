import { CliCommands } from 'common-types';
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

import { listDevicesAsync } from '../commands/listDevicesAsync';
import { getUserPreferences } from '../modules/Storage';
import { DevicesPerPlatform, getDeviceId, getSectionsFromDeviceList } from '../utils/device';

export const useListDevices = () => {
  const [devicesPerPlatform, setDevicesPerPlatform] = useState<DevicesPerPlatform>({
    android: { devices: new Map() },
    ios: { devices: new Map() },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const sections = getSectionsFromDeviceList(devicesPerPlatform);

  const updateDevicesList = useCallback(async () => {
    const {
      showIosSimulators: showIos,
      showTvosSimulators: showTvos,
      showAndroidEmulators: showAndroid,
    } = getUserPreferences();

    setLoading(true);
    try {
      const devicesList = await listDevicesAsync({ platform: 'all' });
      const iosDevices = new Map<
        string,
        CliCommands.ListDevices.Device<CliCommands.Platform.Ios>
      >();
      const androidDevices = new Map<
        string,
        CliCommands.ListDevices.Device<CliCommands.Platform.Android>
      >();

      if (showIos || showTvos) {
        devicesList.ios.devices.forEach((device) => {
          if ((device.osType === 'iOS' && showIos) || (device.osType === 'tvOS' && showTvos)) {
            iosDevices.set(getDeviceId(device), device);
          }
        });
      }

      if (showAndroid) {
        devicesList.android.devices.forEach((device) => {
          androidDevices.set(getDeviceId(device), device);
        });
      }

      setDevicesPerPlatform({
        android: {
          error: devicesList.android.error,
          devices: androidDevices,
        },
        ios: {
          error: devicesList.ios.error,
          devices: iosDevices,
        },
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('popoverFocused', () => {
      updateDevicesList();
    });
    updateDevicesList();

    return () => {
      listener.remove();
    };
  }, [updateDevicesList]);

  return {
    devicesPerPlatform,
    sections,
    numberOfDevices: devicesPerPlatform.android.devices.size + devicesPerPlatform.ios.devices.size,
    loading,
    error,
    refetch: updateDevicesList,
  };
};
