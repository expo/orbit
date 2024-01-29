import { CliCommands } from 'common-types';
import React, { useCallback, useEffect, useState } from 'react';

import { listDevicesAsync } from '../commands/listDevicesAsync';
import { getUserPreferences } from '../modules/Storage';
import { DevicesPerPlatform, getDeviceId, getSectionsFromDeviceList } from '../utils/device';

type ListDevicesContext = {
  devicesPerPlatform: DevicesPerPlatform;
  sections: ReturnType<typeof getSectionsFromDeviceList>;
  numberOfDevices: number;
  hasInitialized: boolean;
  error?: Error;
  refetch: () => Promise<void>;
};

const defaultValues: ListDevicesContext = {
  devicesPerPlatform: {
    android: { devices: new Map() },
    ios: { devices: new Map() },
  },
  sections: [],
  numberOfDevices: 0,
  hasInitialized: false,
  refetch: async () => {},
};

const DevicesContext = React.createContext<ListDevicesContext>(defaultValues);
export const useListDevices = () => React.useContext(DevicesContext);

export function DevicesProvider({ children }: { children: React.ReactNode }) {
  const [devicesPerPlatform, setDevicesPerPlatform] = useState<DevicesPerPlatform>({
    android: { devices: new Map() },
    ios: { devices: new Map() },
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  const [error, setError] = useState<Error>();

  const sections = getSectionsFromDeviceList(devicesPerPlatform);

  const updateDevicesList = useCallback(async () => {
    const {
      showIosSimulators: showIos,
      showTvosSimulators: showTvos,
      showAndroidEmulators: showAndroid,
    } = getUserPreferences();

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
    }
  }, []);

  useEffect(() => {
    updateDevicesList().finally(() => setHasInitialized(true));
  }, [updateDevicesList]);

  return (
    <DevicesContext.Provider
      value={{
        devicesPerPlatform,
        sections,
        numberOfDevices:
          devicesPerPlatform.android.devices.size + devicesPerPlatform.ios.devices.size,
        hasInitialized,
        error,
        refetch: updateDevicesList,
      }}>
      {children}
    </DevicesContext.Provider>
  );
}
