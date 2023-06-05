import {useCallback, useEffect, useState} from 'react';
import {Device, listDevicesAsync} from '../modules/listDevicesAsync';
import {DeviceEventEmitter} from 'react-native';

export const useListDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const updateDevicesList = useCallback(async () => {
    setLoading(true);
    try {
      const devicesList = await listDevicesAsync({platform: 'all'});
      setDevices(devicesList);
    } catch (error) {
      setError(error as Error);
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
  }, []);

  return {
    devices,
    loading,
    error,
    refetch: updateDevicesList,
  };
};
