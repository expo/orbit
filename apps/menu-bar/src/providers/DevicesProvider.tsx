import { CliCommands } from 'common-types';
import {
  Device,
  RemoteSimulator,
  RemoteSimulatorAccount,
  RemoteSimulatorList,
} from 'common-types/build/devices';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { listDevicesAsync } from '../commands/listDevicesAsync';
import { listRemoteSimulatorsAsync } from '../commands/remoteSimulatorAsync';
import { getUserPreferences, sessionSecretStorageKey, storage } from '../modules/Storage';
import { DevicesPerPlatform, getDeviceId, getSectionsFromDeviceList } from '../utils/device';

type ListDevicesContext = {
  devicesPerPlatform: DevicesPerPlatform;
  sections: ReturnType<typeof getSectionsFromDeviceList>;
  numberOfDevices: number;
  hasInitialized: boolean;
  error?: Error;
  refetch: () => Promise<void>;
  /** Whether the user can start an Expo Simulators session, and if not, why. */
  remoteStatus: RemoteStatus;
  /** Accounts that can start an Expo Simulators session. */
  remoteAccounts: RemoteSimulatorAccount[];
  /** The user's Expo Simulators sessions. They are listed in their own section. */
  remoteSessions: RemoteSimulator[];
  /**
   * Shows the row of a session that is starting, before the next list includes it. Call the
   * returned function when the boot ends.
   */
  showStartingRemoteSimulator: (device: RemoteSimulator) => () => void;
};

export type RemoteStatus = 'loading' | 'signed-out' | 'no-access' | 'ready';

const noRemoteSimulators: RemoteSimulatorList = { devices: [], accounts: [] };

const defaultValues: ListDevicesContext = {
  devicesPerPlatform: {
    android: { devices: new Map() },
    ios: { devices: new Map() },
    tvos: { devices: new Map() },
    watchos: { devices: new Map() },
  },
  sections: [],
  numberOfDevices: 0,
  hasInitialized: false,
  refetch: async () => {},
  remoteStatus: 'loading',
  remoteAccounts: [],
  remoteSessions: [],
  showStartingRemoteSimulator: () => () => {},
};

const DevicesContext = React.createContext<ListDevicesContext>(defaultValues);
export const useListDevices = () => React.useContext(DevicesContext);

export function DevicesProvider({ children }: { children: React.ReactNode }) {
  const [localDevicesPerPlatform, setDevicesPerPlatform] = useState<DevicesPerPlatform>({
    android: { devices: new Map() },
    ios: { devices: new Map() },
    tvos: { devices: new Map() },
    watchos: { devices: new Map() },
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  const [error, setError] = useState<Error>();

  // Expo Simulators rows have their own state: a local refresh replaces the local maps, and the
  // local list must never wait for, or fail because of, the remote one.
  const [remote, setRemote] = useState<RemoteSimulatorList>(noRemoteSimulators);
  const [remoteStatus, setRemoteStatus] = useState<RemoteStatus>('loading');
  const startingRemoteSimulators = useRef(new Map<string, RemoteSimulator>());

  const updateRemoteSimulators = useCallback(async () => {
    // Signed out: nothing to list, and no request is sent.
    if (!storage.getString(sessionSecretStorageKey)) {
      setRemote(noRemoteSimulators);
      setRemoteStatus('signed-out');
      return;
    }
    try {
      const list = await listRemoteSimulatorsAsync();
      setRemoteStatus(list.accounts.length ? 'ready' : 'no-access');
      // A list that was requested before a session was created does not include it yet.
      const listed = new Set(list.devices.map(({ id }) => id));
      const starting = [...startingRemoteSimulators.current.values()].filter(
        ({ id }) => !listed.has(id)
      );
      setRemote({ accounts: list.accounts, devices: list.devices.concat(starting) });
    } catch {
      // Keep the last list: a failed request must not hide a session that still runs.
    }
  }, []);

  const showStartingRemoteSimulator = useCallback((device: RemoteSimulator) => {
    startingRemoteSimulators.current.set(device.id, device);
    setRemote((prev) =>
      prev.devices.some(({ id }) => id === device.id)
        ? prev
        : { ...prev, devices: prev.devices.concat(device) }
    );
    return () => {
      startingRemoteSimulators.current.delete(device.id);
    };
  }, []);

  const remoteSessions = useMemo(
    () => remote.devices.filter(({ state }) => state !== 'Shutdown'),
    [remote]
  );

  const { showAndroidEmulators } = getUserPreferences();
  // Sessions are not in `devicesPerPlatform`: the local launch code reads that, and it must
  // never get a session.
  const devicesPerPlatform = localDevicesPerPlatform;
  const sections = [
    ...getSectionsFromDeviceList(devicesPerPlatform, { alwaysShowAndroid: showAndroidEmulators }),
    // Always listed, also with no session: its header holds the button that starts one.
    { data: remoteSessions as Device[], key: 'remote', label: 'Remote devices' },
  ];

  const updateDevicesList = useCallback(async () => {
    const {
      showIosSimulators: showIos,
      showTvosSimulators: showTvos,
      showWatchosSimulators: showWatchos,
      showAndroidEmulators: showAndroid,
    } = getUserPreferences();

    const iosDevices = new Map<string, CliCommands.ListDevices.Device<CliCommands.Platform.Ios>>();
    const tvosDevices = new Map<
      string,
      CliCommands.ListDevices.Device<CliCommands.Platform.Tvos>
    >();
    const watchosDevices = new Map<
      string,
      CliCommands.ListDevices.Device<CliCommands.Platform.Watchos>
    >();
    const androidDevices = new Map<
      string,
      CliCommands.ListDevices.Device<CliCommands.Platform.Android>
    >();

    if (!showIos && !showTvos && !showWatchos && !showAndroid) {
      setDevicesPerPlatform({
        android: { error: undefined, devices: androidDevices },
        ios: { error: undefined, devices: iosDevices },
        tvos: { error: undefined, devices: tvosDevices },
        watchos: { error: undefined, devices: watchosDevices },
      });
    }

    const showApple = showIos || showTvos || showWatchos;
    const platform = showAndroid && showApple ? 'all' : showAndroid ? 'android' : 'ios';
    try {
      const devicesList = await listDevicesAsync({ platform });

      if (showIos) {
        devicesList.ios.devices.forEach((device) => {
          iosDevices.set(getDeviceId(device), device);
        });
      }

      if (showTvos) {
        devicesList.tvos.devices.forEach((device) => {
          tvosDevices.set(getDeviceId(device), device);
        });
      }

      if (showWatchos) {
        devicesList.watchos.devices.forEach((device) => {
          watchosDevices.set(getDeviceId(device), device);
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
        tvos: {
          error: devicesList.tvos.error,
          devices: tvosDevices,
        },
        watchos: {
          error: devicesList.watchos.error,
          devices: watchosDevices,
        },
      });
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  useEffect(() => {
    updateDevicesList().finally(() => setHasInitialized(true));
    updateRemoteSimulators();
  }, [updateDevicesList, updateRemoteSimulators]);

  const refetch = useCallback(async () => {
    await Promise.all([updateDevicesList(), updateRemoteSimulators()]);
  }, [updateDevicesList, updateRemoteSimulators]);

  return (
    <DevicesContext
      value={{
        devicesPerPlatform,
        sections,
        numberOfDevices:
          devicesPerPlatform.android.devices.size +
          devicesPerPlatform.ios.devices.size +
          devicesPerPlatform.tvos.devices.size +
          devicesPerPlatform.watchos.devices.size +
          remoteSessions.length,
        hasInitialized,
        error,
        refetch,
        remoteStatus,
        remoteAccounts: remote.accounts,
        remoteSessions,
        showStartingRemoteSimulator,
      }}>
      {children}
    </DevicesContext>
  );
}
