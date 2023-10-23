import { DevicesPerPlatform } from 'common-types/build/cli-commands/listDevices';
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

import { listDevicesAsync } from '../commands/listDevicesAsync';
import { getUserPreferences } from '../modules/Storage';
import { getSectionsFromDeviceList } from '../utils/device';

export const useListDevices = () => {
  const [devicesPerPlatform, setDevicesPerPlatform] = useState<DevicesPerPlatform>({
    android: { devices: [] },
    ios: { devices: [] },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const sections = getSectionsFromDeviceList(devicesPerPlatform);

  const updateDevicesList = useCallback(async () => {
    const userPreferences = getUserPreferences();
    setLoading(true);
    try {
      const devicesList = await listDevicesAsync({ platform: 'all' });
      const showIos = userPreferences.showIosSimulators;
      const showTvos = userPreferences.showTvosSimulators;
      const showAndroid = userPreferences.showAndroidEmulators;
      if (!showIos) {
        devicesList.ios.devices = devicesList.ios.devices.filter(
          (device) => device.osType !== 'iOS'
        );
      }
      if (!showTvos) {
        devicesList.ios.devices = devicesList.ios.devices.filter(
          (device) => device.osType !== 'tvOS'
        );
      }
      if (!showAndroid) {
        devicesList.android.devices = [];
      }
      setDevicesPerPlatform(devicesList);
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
    numberOfDevices:
      devicesPerPlatform.android.devices.length + devicesPerPlatform.ios.devices.length,
    loading,
    error,
    refetch: updateDevicesList,
  };
};
