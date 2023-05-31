import {useCallback, useEffect, useState} from 'react';
import {listDevicesAsync} from '../modules/listDevicesAsync';

export const useListDevices = () => {
  const [devices, setDevices] = useState<any[]>([]);
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
    updateDevicesList();
  }, []);

  return {
    devices,
    loading,
    error,
    refetch: updateDevicesList,
  };
};
