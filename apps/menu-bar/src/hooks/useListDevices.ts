import { DevicesPerPlatform } from 'common-types/build/cli-commands/listDevices';
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

import { listDevicesAsync } from '../commands/listDevicesAsync';
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
    setLoading(true);
    try {
      const devicesList = await listDevicesAsync({ platform: 'all' });
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
