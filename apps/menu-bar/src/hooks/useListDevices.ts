import { Device } from 'common-types/devices';
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

import { listDevicesAsync } from '../commands/listDevicesAsync';

export const useListDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const updateDevicesList = useCallback(async () => {
    setLoading(true);
    try {
      const devicesList = await listDevicesAsync({ platform: 'all' });
      setDevices(devicesList);
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
    devices,
    loading,
    error,
    refetch: updateDevicesList,
  };
};
