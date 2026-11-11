import { Config, InternalError } from 'common-types';
import { MultipleAppsInTarballErrorDetails } from 'common-types/build/InternalError';
import { Device, RemoteSimulator } from 'common-types/build/devices';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { SectionList, TouchableOpacity } from 'react-native';

import AccountRow, { ACCOUNT_ROW_HEIGHT } from './AccountRow';
import AppleDeviceHelperPrompt from './AppleDeviceHelperPrompt';
import BuildsSection, { BUILDS_SECTION_HEIGHT } from './BuildsSection';
import DeviceListSectionHeader from './DeviceListSectionHeader';
import DevicesListError from './DevicesListError';
import EverythingHidden from './EverythingHidden';
import { FOOTER_HEIGHT } from './Footer';
import ProjectsSection, { getProjectSectionHeight } from './ProjectsSection';
import ResignedAppsAttentionRow, { ATTENTION_ROW_HEIGHT } from './ResignedAppsAttentionRow';
import { SECTION_HEADER_HEIGHT } from './SectionHeader';
import TasksSection, { TASK_HEIGHT, getDeviceStatus } from './TasksSection';
import { useFileHandler } from '../../modules/file-handler';
import type { MenuItem } from '../../modules/menu-bar/src/types';
import { Analytics, Event } from '../analytics';
import { withApolloProvider } from '../api/ApolloClient';
import { bootDeviceAsync } from '../commands/bootDeviceAsync';
import { detectAppleAppTypeAsync } from '../commands/detectAppleAppTypeAsync';
import { downloadBuildAsync } from '../commands/downloadBuildAsync';
import { installAndLaunchAppAsync } from '../commands/installAndLaunchAppAsync';
import { launchExpoGoAsync } from '../commands/launchExpoGoAsync';
import { launchUpdateAsync } from '../commands/launchUpdateAsync';
import { stopRemoteSimulatorAsync } from '../commands/remoteSimulatorAsync';
import {
  handleFreeAppLimitAsync,
  handleUntrustedDeveloperAsync,
  resignAndRetryAsync,
} from '../commands/resignAndRetryAsync';
import { stopDeviceAsync } from '../commands/stopDeviceAsync';
import { Spacer, Text, View } from '../components';
import AddDeviceItem from '../components/AddDeviceItem';
import DeviceItem, { DEVICE_ITEM_HEIGHT, isValidDevice } from '../components/DeviceItem';
import { secondaryText } from '../components/Text';
import { useAccounts } from '../hooks/useAccounts';
import { useDeepLinking } from '../hooks/useDeepLinking';
import { useDeviceAudioPreferences } from '../hooks/useDeviceAudioPreferences';
import { useGetPinnedApps } from '../hooks/useGetPinnedApps';
import { usePopoverFocusEffect } from '../hooks/usePopoverFocus';
import { useResignedAppRenewals } from '../hooks/useResignedAppRenewals';
import { useSafeDisplayDimensions } from '../hooks/useSafeDisplayDimensions';
import Alert from '../modules/Alert';
import { DeviceEventEmitter } from '../modules/DeviceEventEmitter';
import { Linking } from '../modules/Linking';
import MenuBarModule from '../modules/MenuBarModule';
import {
  DeviceListPreferences,
  SelectedDevicesIds,
  deviceListStorageKey,
  getDeviceListPreferences,
  saveDeviceListPreferences,
  getUserPreferences,
  getLastRemoteSimulatorAppId,
  getLastRemoteSimulatorController,
  saveLastRemoteSimulatorController,
  getSelectedDevicesIds,
  saveLastRemoteSimulatorAppId,
  saveSelectedDevicesIds,
  sessionSecretStorageKey,
  storage,
  userPreferencesStorageKey,
} from '../modules/Storage';
import { useListDevices } from '../providers/DevicesProvider';
import { authenticateAsync } from '../utils/auth';
import {
  DevicePlatform,
  DevicesPerPlatform,
  PlatformToDevice,
  getDeviceId,
  getCollapsedDevices,
  moveItem,
  orderDevices,
  getDeviceOS,
  getRemoteArchivePlatform,
  isRemoteDevice,
  isVirtualDevice,
} from '../utils/device';
import { MenuBarStatus, Task, describeResignStep, resignStepProgress } from '../utils/helpers';
import {
  URLType,
  getPlatformFromURI,
  handleAuthUrl,
  identifyAndParseDeeplinkURL,
} from '../utils/parseUrl';
import { describeResignReason, resignReasonForDevice } from '../utils/provisioning';
import {
  RemoteSimulatorStartOptions,
  SUGGESTED_REMOTE_DEVICES,
  START_REMOTE_SIMULATOR_EVENT,
  StartRemoteSimulatorRequest,
  getNewRemoteSession,
  getNewRemoteSessionDevice,
  getNewRemoteSessionId,
  getPendingRemoteSession,
  getRemoteSimulatorDeviceName,
  getRemoteSimulatorSessionUrl,
  isPendingRemoteSession,
  getRemoteSimulatorProjects,
  RemoteSimulatorProject,
  parseStartedRemoteSimulator,
  REMOTE_SIMULATOR_CONTROLLERS,
  getRemoteSimulatorController,
  isEndedRemoteSession,
} from '../utils/remoteSimulator';
import { describeResignError } from '../utils/resignErrorCopy';
import { WindowsNavigator } from '../windows';

type Props = {
  isDevWindow: boolean;
};

const SECTION_TOGGLE_HEIGHT = 24;
// Space under a section, so the next header does not touch the last row.
const SECTION_GAP = 10;
const LAST_SECTION_GAP = 7;

function alertUntrustedSource(error: InternalError) {
  Alert.alert(
    'Untrusted source',
    `${error.message}\n\nYou add custom trusted sources through the Settings window.`,
    [
      { text: 'OK', style: 'default' },
      { text: 'Open Settings', onPress: () => WindowsNavigator.open('Settings') },
    ]
  );
}

function alertRemoteSimulatorError(error: unknown) {
  if (error instanceof InternalError && error.code === 'UNTRUSTED_SOURCE') {
    alertUntrustedSource(error);
  } else if (error instanceof Error) {
    Alert.alert('Expo Simulators', error.message);
  }
}

// The sessions in the order of their rows: by start time, the newest first. A session that
// starts has no start time yet and comes first, where its pending row was. A session keeps
// its place when it ends, so the rows do not move when the user stops a session.
const orderRemoteSessions = (sessions: RemoteSimulator[]): Device[] => {
  const startTime = ({ startedAt }: RemoteSimulator) =>
    startedAt ? new Date(startedAt).getTime() : Infinity;
  return [...sessions].sort((a, b) => startTime(b) - startTime(a));
};

// A session started: opens its page on expo.dev in the browser, or asks first, as the user
// chose in Settings. The page shows the screen of the device.
const openRemoteSessionInBrowser = (session: RemoteSimulator) => {
  const url = getRemoteSimulatorSessionUrl(session);
  const { openRemoteSessionInBrowser: choice } = getUserPreferences();
  if (!url || choice === 'never') {
    return;
  }
  if (choice === 'always') {
    Linking.openURL(url);
    return;
  }
  Alert.alert(
    'Open the session in the browser?',
    'The page of the session on expo.dev shows the screen of the device.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open', onPress: () => Linking.openURL(url) },
    ]
  );
};

// The id of the task of a build that goes to a session.
const getRemoteTaskId = (appURI: string) => `remote:${appURI}`;

function Core(props: Props) {
  const [selectedDevicesIds, setSelectedDevicesIds] =
    useState<SelectedDevicesIds>(getSelectedDevicesIds());

  const accountState = useAccounts();
  const selectedAccountName = accountState.selectedAccount?.name;
  const {
    apps,
    pinnedApps,
    accounts,
    refetch: refetchApps,
  } = useGetPinnedApps(selectedAccountName);
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
    sections,
    refetch,
    error: devicesError,
    hasInitialized,
    remoteStatus,
    remoteAccounts,
    remoteSessions,
    showStartingRemoteSimulator,
    archiveRemoteSession,
  } = useListDevices();
  const [remoteProjectId, setRemoteProjectId] = useState(getLastRemoteSimulatorAppId());
  // The default controller of a session. The "Create new simulator" window can change it too.
  const [remoteController, setRemoteController] = useState(() =>
    getRemoteSimulatorController(getLastRemoteSimulatorController())
  );
  usePopoverFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );
  const { emulatorWithoutAudio } = useDeviceAudioPreferences();

  const { attention } = useResignedAppRenewals({ createTask, updateTask, deleteTask });

  // Settings shows or hides each section.
  const [preferences, setPreferences] = useState(getUserPreferences());
  useEffect(() => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === userPreferencesStorageKey) {
        setPreferences(getUserPreferences());
      }
    });
    return () => listener.remove();
  }, []);
  const showProjects = preferences.showProjects;
  const showBuilds = preferences.showBuilds;

  // TODO: Extract into a hook
  const displayDimensions = useSafeDisplayDimensions();
  const estimatedAvailableSizeForDevices =
    (displayDimensions.height || 0) -
    FOOTER_HEIGHT -
    (showBuilds ? BUILDS_SECTION_HEIGHT : 0) -
    ACCOUNT_ROW_HEIGHT -
    [...tasks.values()].filter(({ deviceId }) => !deviceId).length * TASK_HEIGHT -
    (showProjects ? getProjectSectionHeight(apps?.length) : 0) -
    (attention ? ATTENTION_ROW_HEIGHT : 0) -
    5;
  // A long list of simulators pushes the other sections out of reach, so each section shows
  // its most relevant devices until the user asks for all of them.
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  // The sessions that the user started and that have no id yet. Each shows as a row at once.
  const [pendingRemoteSessions, setPendingRemoteSessions] = useState<RemoteSimulator[]>([]);
  // The order that the user gave to the devices, and the devices that the user hid. The
  // Settings window can change them too.
  const [deviceList, setDeviceList] = useState(getDeviceListPreferences());
  useEffect(() => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === deviceListStorageKey) {
        setDeviceList(getDeviceListPreferences());
      }
    });
    return () => listener.remove();
  }, []);
  // On Windows and Linux a storage listener does not see a change from the Settings window. So
  // read the stored values again each time the popover opens.
  usePopoverFocusEffect(
    useCallback(() => {
      setPreferences(getUserPreferences());
      setDeviceList(getDeviceListPreferences());
      setRemoteController(getRemoteSimulatorController(getLastRemoteSimulatorController()));
    }, [])
  );
  const updateDeviceList = (change: (prev: DeviceListPreferences) => DeviceListPreferences) => {
    const next = change(getDeviceListPreferences());
    saveDeviceListPreferences(next);
    setDeviceList(next);
  };
  // The devices of a section that show, in the order of the section.
  const getOrderedDevices = (key: string, devices: Device[]) =>
    orderDevices(
      devices.filter((device) => !deviceList.hidden.includes(getDeviceId(device))),
      deviceList.order[key]
    );
  // The row that the user drags, and the position that it goes to.
  const [drag, setDrag] = useState<{ key: string; from: number; to: number }>();

  const shownSections = sections.filter(
    ({ key }) => key !== 'remote' || preferences.showRemoteDevices
  );
  const visibleSections = shownSections.map((section, index) => {
    const key = section.key ?? '';
    const selectedId = selectedDevicesIds[key as DevicePlatform];
    const devices =
      key === 'remote'
        ? [...pendingRemoteSessions, ...orderRemoteSessions(section.data as RemoteSimulator[])]
        : getOrderedDevices(key, section.data as Device[]);
    const collapsed = getCollapsedDevices(
      devices,
      selectedId,
      undefined,
      !!deviceList.order[key]?.length
    );
    const hiddenCount = devices.length - collapsed.length;
    const isExpanded = expandedSections.has(key);
    const isLoading = key === 'remote' ? remoteStatus === 'loading' : !hasInitialized;
    const emptyText =
      section.data.length || section.error || isLoading
        ? ''
        : key === 'ios'
          ? 'No simulators or devices found'
          : '';
    const allHiddenText =
      key !== 'remote' && section.data.length && !devices.length
        ? 'All devices are hidden. Settings shows them again.'
        : '';
    // The Android section and the Expo Simulators section end with a row that adds a device.
    const addItem =
      key === 'android'
        ? { title: 'Pair a device', subtitle: 'Over Wi-Fi' }
        : key === 'remote' && !isLoading
          ? {
              title: 'New session',
              subtitle:
                remoteStatus === 'signed-out'
                  ? 'Log in to use Expo Simulators'
                  : remoteStatus === 'no-access'
                    ? 'Available on paid plans'
                    : 'iOS Simulator or Android Emulator',
            }
          : undefined;
    return {
      ...section,
      key,
      data: isExpanded ? devices : collapsed,
      hiddenCount,
      isExpanded,
      emptyText: emptyText || allHiddenText,
      addItem,
      gap: index === shownSections.length - 1 ? LAST_SECTION_GAP : SECTION_GAP,
    };
  });
  // A task for a device shows in the row of that device. A task with no device, or with a
  // device that has no row now, shows above the sections.
  const shownDeviceIds = new Set(
    visibleSections.flatMap((section) => (section.data as Device[]).map(getDeviceId))
  );
  const deviceTasks = new Map<string, Task>();
  const otherTasks = new Map<string, Task>();
  for (const task of tasks.values()) {
    if (task.deviceId && shownDeviceIds.has(task.deviceId)) {
      deviceTasks.set(task.deviceId, task);
    } else {
      otherTasks.set(task.id, task);
    }
  }
  // The user hid every section that can be hidden. Projects with no project shows nothing.
  const isEverythingHidden =
    !showBuilds &&
    tasks.size === 0 &&
    !(showProjects && apps?.length) &&
    visibleSections.length === 0 &&
    !devicesError &&
    hasInitialized;
  const heightOfAllDevices = visibleSections.reduce(
    (height, section) =>
      height +
      SECTION_HEADER_HEIGHT +
      DEVICE_ITEM_HEIGHT * section.data.length +
      (section.hiddenCount || section.emptyText ? SECTION_TOGGLE_HEIGHT : 0) +
      (section.addItem ? DEVICE_ITEM_HEIGHT : 0) +
      section.gap,
    0
  );
  const estimatedListHeight =
    heightOfAllDevices <= estimatedAvailableSizeForDevices || estimatedAvailableSizeForDevices <= 0
      ? heightOfAllDevices
      : estimatedAvailableSizeForDevices;

  const persistSelectedDevice = useCallback((device: Device) => {
    const platform = getDeviceOS(device);
    setSelectedDevicesIds((prev) => {
      const newValue = { ...prev, [platform]: getDeviceId(device) };
      saveSelectedDevicesIds(newValue);
      return newValue;
    });
  }, []);

  const findDeviceById = useCallback(
    (deviceId: string): Device | undefined => {
      for (const { devices } of Object.values(devicesPerPlatform)) {
        const device = devices.get(deviceId);
        if (device) return device;
      }
      return undefined;
    },
    [devicesPerPlatform]
  );

  const warnDeviceIdNotFound = useCallback(
    (deviceId: string) => {
      createTask({
        id: 'device-not-found',
        status: MenuBarStatus.WARNING,
        progress: 0,
        message: `Device "${deviceId}" not found. Auto-selecting another device.`,
      });
      setTimeout(() => {
        deleteTask('device-not-found');
      }, 8000);
    },
    [createTask, deleteTask]
  );

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
      return getNewRemoteSessionDevice(prev[platform])
        ? prev
        : { ...prev, [platform]: getDeviceId(device) };
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
        audio: !emulatorWithoutAudio,
      });
    },
    [emulatorWithoutAudio]
  );

  // A session needs a project to run under. Orbit asks once and then reuses the answer;
  // `change` asks again. Returns undefined when the user cancels or no project can be used.
  const chooseRemoteProject = useCallback(
    async ({ change = false } = {}) => {
      const projects = getRemoteSimulatorProjects({
        remoteAccounts,
        accounts,
        pinnedApps,
        lastAppId: remoteProjectId,
      });
      if (!projects.length) {
        Alert.alert(
          'No project found',
          'An Expo Simulators session runs under a project. Orbit found no pinned or recent project in an account with access to Expo Simulators.'
        );
        return undefined;
      }
      const current = projects.find(({ id }) => id === remoteProjectId);
      if (current && !change) {
        return current;
      }
      try {
        const index = await MenuBarModule.showMultiOptionAlert(
          'Project for Expo Simulators',
          'Sessions run under this project. They use your Expo plan.',
          projects.map(({ label }) => label)
        );
        const project = projects[index];
        if (project) {
          saveLastRemoteSimulatorAppId(project.id);
          setRemoteProjectId(project.id);
        }
        return project;
      } catch {
        return undefined; // Cancelled.
      }
    },
    [accounts, pinnedApps, remoteAccounts, remoteProjectId]
  );
  // Starts an Expo Simulators session, optionally with a build. Every start goes through here,
  // and more than one session can start at the same time.
  // The sessions that the user stopped. A session that stops while it starts makes the start
  // fail, and that failure needs no alert.
  const stoppedRemoteSessions = useRef(new Set<string>());
  // The key of the row of a session that Orbit started: the id of its pending row.
  const remoteRowKeys = useRef(new Map<string, string>());
  const bootRemoteSimulator = useCallback(
    async (
      platform: 'ios' | 'android',
      build?: { url: string; launchURL?: string },
      chosenProject?: { id: string; label: string },
      options?: RemoteSimulatorStartOptions
    ) => {
      let hideStartingRow: (() => void) | undefined;
      let startedSessionId: string | undefined;
      try {
        const project = chosenProject ?? (await chooseRemoteProject());
        if (!project) {
          return;
        }
        const startedProject = project;
        const pending = getPendingRemoteSession(
          platform,
          startedProject,
          options?.deviceIdentifier
        );
        setPendingRemoteSessions((prev) => prev.concat(pending));
        const hidePendingRow = () =>
          setPendingRemoteSessions((prev) => prev.filter(({ id }) => id !== pending.id));
        hideStartingRow = hidePendingRow;
        // The task of the build shows in the row of its session.
        if (build) {
          updateTask({ id: getRemoteTaskId(build.url), deviceId: pending.id });
        }

        await bootDeviceAsync(
          {
            platform,
            id: `eas:${platform}`,
            remote: {
              ...options,
              appId: startedProject.id,
              archiveUrl: build?.url ?? options?.archiveUrl,
              openUrl: build?.launchURL,
            },
          },
          (output) => {
            const session = parseStartedRemoteSimulator(output, platform, startedProject);
            if (!session) {
              return;
            }
            session.deviceIdentifier = options?.deviceIdentifier;
            // Orbit installs builds only through Agent Device, which is also the controller
            // of a session that starts with no choice.
            session.installable = (options?.sessionType ?? 'agent-device') === 'agent-device';
            startedSessionId = session.id;
            if (build) {
              updateTask({ id: getRemoteTaskId(build.url), deviceId: session.id });
            }
            // Show and select the session now. The next launch then finds it as `Starting`
            // and does not start another one.
            // The row of the session takes the place of the pending row and keeps its key, so
            // the row and its spinner do not start again.
            remoteRowKeys.current.set(session.id, pending.id);
            hidePendingRow();
            hideStartingRow = showStartingRemoteSimulator(session);
            openRemoteSessionInBrowser(session);
            // When each build gets a new session, that stays the default. A session that
            // cannot take a build does not replace the default device.
            if (
              session.installable &&
              !getNewRemoteSessionDevice(getSelectedDevicesIds()[platform])
            ) {
              persistSelectedDevice(session);
            }
          }
        );
      } catch (error) {
        // No alert when the user stopped the session while it started.
        if (!startedSessionId || !stoppedRemoteSessions.current.delete(startedSessionId)) {
          alertRemoteSimulatorError(error);
        }
      } finally {
        // First forget the row, so that the new list does not show a session that failed.
        hideStartingRow?.();
        await refetch();
      }
    },
    [chooseRemoteProject, showStartingRemoteSimulator, persistSelectedDevice, refetch, updateTask]
  );

  // The session a build goes to: only the one the user selected or asked for, and only for a
  // build that a session can download. Every other launch takes the local path.
  const getRemoteTarget = useCallback(
    (appURI: string, deviceId?: string): RemoteSimulator | undefined => {
      const platform = getRemoteArchivePlatform(appURI);
      if (!platform) {
        return undefined;
      }
      // Only the default that the user selected can ask for a new session. A device id from
      // a link cannot: a link must not start a session that uses the plan.
      if (!deviceId && getNewRemoteSessionDevice(selectedDevicesIds[platform])) {
        return getNewRemoteSession(platform);
      }
      const id = deviceId ?? selectedDevicesIds[platform];
      return remoteSessions.find(
        (session) => session.id === id && getDeviceOS(session) === platform
      );
    },
    [remoteSessions, selectedDevicesIds]
  );

  // The "+" of the Expo Simulators section.
  const startRemoteSimulator = useCallback(() => {
    if (remoteStatus === 'signed-out') {
      Alert.alert(
        'Log in to use Expo Simulators',
        'Run your builds on iOS simulators and Android emulators that Expo hosts.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log in',
            onPress: () =>
              authenticateAsync('login').then(refetch).catch(alertRemoteSimulatorError),
          },
        ]
      );
    } else if (remoteStatus === 'no-access') {
      Alert.alert(
        'Expo Simulators needs a paid plan',
        'Run your builds on iOS simulators and Android emulators that Expo hosts. None of your accounts is on a paid plan.',
        [
          { text: 'Cancel', style: 'cancel' },
          // `[account]` is literal: expo.dev asks which account to open.
          {
            text: 'View plans',
            onPress: () =>
              Linking.openURL(`${Config.website.origin}/accounts/[account]/settings/billing`),
          },
        ]
      );
    } else if (remoteStatus === 'ready') {
      WindowsNavigator.open('NewSimulator');
      // The window has the focus now. The popover opens again when the session starts.
      MenuBarModule.closePopover();
    }
  }, [remoteStatus, refetch]);

  // The "Create new simulator" window sends the choices; the popover starts the session, so
  // that the session shows in the list while it starts.
  useEffect(() => {
    const listener = DeviceEventEmitter.addListener(
      START_REMOTE_SIMULATOR_EVENT,
      ({ platform, project, options }: StartRemoteSimulatorRequest) => {
        // The development window has a second popover. Only one of them starts the session.
        if (props.isDevWindow) {
          return;
        }
        saveLastRemoteSimulatorAppId(project.id);
        setRemoteProjectId(project.id);
        // Show the session while it starts.
        MenuBarModule.openPopover();
        bootRemoteSimulator(platform, undefined, project, options);
      }
    );
    return () => listener.remove();
  }, [bootRemoteSimulator, props.isDevWindow]);

  // The devices that Orbit stops now. The row of each shows a spinner and "Stopping...".
  const [stoppingDeviceIds, setStoppingDeviceIds] = useState<Set<string>>(new Set());
  const setIsStopping = useCallback((id: string, isStopping: boolean) => {
    setStoppingDeviceIds((prev) => {
      const next = new Set(prev);
      if (isStopping) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  // Returns whether the session stopped.
  const stopRemoteSimulator = useCallback(
    async (device: RemoteSimulator) => {
      let stopped = true;
      stoppedRemoteSessions.current.add(device.id);
      setIsStopping(device.id, true);
      try {
        await stopRemoteSimulatorAsync(device.id);
      } catch (error) {
        stopped = false;
        stoppedRemoteSessions.current.delete(device.id);
        alertRemoteSimulatorError(error);
      }
      await refetch();
      // A session that stopped keeps the mark: its row can stay for a moment, until the start
      // that was in progress ends.
      if (!stopped) {
        setIsStopping(device.id, false);
      }
      return stopped;
    },
    [refetch, setIsStopping]
  );

  const installOnRemoteSimulator = useCallback(
    async (
      target: RemoteSimulator,
      appURI: string,
      launchURL?: string,
      buildProject?: RemoteSimulatorProject
    ) => {
      const platform = getDeviceOS(target) as 'ios' | 'android';
      // A new session runs under the project of the build, when that project is known and its
      // account can use Expo Simulators. If not, it runs under the project that was used last.
      const project =
        buildProject && remoteAccounts.some(({ name }) => buildProject.label.startsWith(`${name}/`))
          ? buildProject
          : undefined;
      if (target.state === 'Shutdown') {
        createTask({
          id: getRemoteTaskId(appURI),
          status: MenuBarStatus.BOOTING_DEVICE,
          progress: 0,
        });
        // The default can name the device model of the new session.
        const deviceIdentifier = getNewRemoteSessionDevice(getSelectedDevicesIds()[platform]);
        await bootRemoteSimulator(platform, { url: appURI, launchURL }, project, {
          ...(deviceIdentifier ? { deviceIdentifier } : {}),
          // The session gets the default controller. It starts with the build, so the build
          // needs no Agent Device.
          sessionType: getRemoteSimulatorController(getLastRemoteSimulatorController()).id,
        });
        return;
      }
      if (target.state === 'Starting') {
        Alert.alert(
          'The Expo Simulators session is still starting',
          'Launch the build again when the session shows as Running.'
        );
        return;
      }
      if (!target.installable) {
        Alert.alert(
          'This session cannot take a build from Orbit',
          'It was started with a controller that Orbit does not use. Start a session from Orbit, or select a local device.'
        );
        return;
      }

      createTask({
        id: getRemoteTaskId(appURI),
        status: MenuBarStatus.INSTALLING_APP,
        progress: 0,
        deviceId: target.id,
      });
      try {
        await installAndLaunchAppAsync({ appPath: appURI, deviceId: target.id, launchURL });
      } catch (error) {
        if (error instanceof InternalError && error.code === 'REMOTE_SIMULATOR_UNAVAILABLE') {
          Alert.alert('The Expo Simulators session is not reachable', error.message, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Stop session', onPress: () => stopRemoteSimulator(target) },
            {
              text: 'Replace session',
              onPress: async () => {
                // A second session starts only when the first one stopped.
                if (await stopRemoteSimulator(target)) {
                  await bootRemoteSimulator(platform, { url: appURI, launchURL }, project, {
                    sessionType: getRemoteSimulatorController(getLastRemoteSimulatorController())
                      .id,
                  });
                }
              },
            },
          ]);
        } else {
          alertRemoteSimulatorError(error);
        }
      }
    },
    [bootRemoteSimulator, stopRemoteSimulator, createTask, remoteAccounts]
  );

  const getDeviceByPlatform = useCallback(
    <P extends DevicePlatform>(
      platform: P,
      deviceType?: Device['deviceType']
    ): PlatformToDevice<P> | undefined => {
      const devices = devicesPerPlatform[platform as keyof DevicesPerPlatform].devices;
      const selectedDevicesId = selectedDevicesIds[platform];
      // A selected Expo Simulators session cannot take what the local path launches, so it
      // gets the same warning as a device of the wrong type.
      const selectsNewSession = !!getNewRemoteSessionDevice(selectedDevicesId);
      const selectedIsSession =
        selectsNewSession || remoteSessions.some(({ id }) => id === selectedDevicesId);
      if (selectedDevicesId && (devices.has(selectedDevicesId) || selectedIsSession)) {
        const device = devices.get(selectedDevicesId);
        if (device && (!deviceType || device.deviceType === deviceType)) {
          return devices.get(selectedDevicesId) as PlatformToDevice<P> | undefined;
        } else {
          createTask({
            id: 'incompatible-device-selected',
            status: MenuBarStatus.WARNING,
            progress: 0,
            message:
              "The app you're trying to run is not compatible with the selected device. Auto-selecting another device.",
          });
          setTimeout(() => {
            deleteTask('incompatible-device-selected');
          }, 8000);
        }
      }

      for (const device of devices.values()) {
        if (
          (deviceType === 'device' && device.deviceType === deviceType) ||
          (deviceType !== 'device' && isVirtualDevice(device) && device.state === 'Booted')
        ) {
          // "New session for each build" stays the default: this launch is an exception.
          if (!selectsNewSession) {
            setSelectedDevicesIds((prev) => {
              const newValue = { ...prev, [platform]: getDeviceId(device) };
              saveSelectedDevicesIds(newValue);
              return newValue;
            });
          }
          return device as PlatformToDevice<P>;
        }
      }

      const firstDevice = [...devices.values()].find(
        (d) => !deviceType || d.deviceType === deviceType
      );
      if (!firstDevice) {
        return;
      }

      if (!selectsNewSession) {
        setSelectedDevicesIds((prev) => ({ ...prev, [platform]: getDeviceId(firstDevice) }));
      }
      return firstDevice as PlatformToDevice<P>;
    },
    [createTask, deleteTask, devicesPerPlatform, selectedDevicesIds, remoteSessions]
  );

  const handleExpoGoUrl = useCallback(
    async (url: string, sdkVersion?: string | null, deviceId?: string) => {
      let device: PlatformToDevice<'ios' | 'android'> | undefined;
      if (deviceId) {
        const requested = findDeviceById(deviceId);
        const requestedPlatform = requested ? getDeviceOS(requested) : undefined;
        if (requested && (requestedPlatform === 'ios' || requestedPlatform === 'android')) {
          device = requested as PlatformToDevice<'ios' | 'android'>;
          persistSelectedDevice(requested);
        } else {
          warnDeviceIdNotFound(deviceId);
        }
      }
      if (!device) {
        device = getAvailableDeviceForExpoGo() as PlatformToDevice<'ios' | 'android'> | undefined;
      }
      if (!device) {
        return;
      }

      try {
        createTask({
          id: url,
          status: MenuBarStatus.BOOTING_DEVICE,
          progress: 0,
          deviceId: getDeviceId(device),
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
    [
      ensureDeviceIsRunning,
      getAvailableDeviceForExpoGo,
      findDeviceById,
      warnDeviceIdNotFound,
      persistSelectedDevice,
      createTask,
      deleteTask,
      updateTask,
    ]
  );

  const handleUpdateUrl = useCallback(
    async (url: string, deviceId?: string) => {
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

      let device: PlatformToDevice<typeof platform> | undefined;
      if (deviceId) {
        const requested = findDeviceById(deviceId);
        if (!requested || getDeviceOS(requested) !== platform) {
          warnDeviceIdNotFound(deviceId);
        } else {
          device = requested as PlatformToDevice<typeof platform>;
          persistSelectedDevice(requested);
        }
      }
      if (!device) {
        device = getDeviceByPlatform(platform);
      }
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
          deviceId: getDeviceId(device),
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
            updateTask({ id: url, status, ...(progress != null && { progress }) });
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
    [
      ensureDeviceIsRunning,
      getDeviceByPlatform,
      findDeviceById,
      warnDeviceIdNotFound,
      persistSelectedDevice,
      createTask,
      deleteTask,
      updateTask,
    ]
  );

  const launchingBuilds = useRef(new Set<string>());
  const installAppFromURI = useCallback(
    async (
      appURI: string,
      launchURL?: string,
      deviceId?: string,
      // The project of the build, when the caller knows it.
      project?: RemoteSimulatorProject
    ) => {
      const remoteTarget = getRemoteTarget(appURI, deviceId);
      // A launch to a session and a launch to a local device are different tasks: a session
      // that starts with a build must not stop a launch of that build on a local device.
      const taskId = remoteTarget ? getRemoteTaskId(appURI) : appURI;
      // One launch of a build to one kind of device at a time. The set is exact also for two
      // clicks in one render: a second launch for a new session would start a second session.
      if (tasks.has(taskId) || launchingBuilds.current.has(taskId)) {
        return;
      }
      launchingBuilds.current.add(taskId);

      if (remoteTarget) {
        // The session downloads the build itself, so nothing is downloaded here.
        try {
          await installOnRemoteSimulator(remoteTarget, appURI, launchURL, project);
        } finally {
          launchingBuilds.current.delete(taskId);
          setTimeout(() => {
            deleteTask(taskId);
          }, 2000);
        }
        return;
      }

      let localFilePath = appURI.startsWith('https://') ? undefined : appURI;

      // Phase timings, written to the Debug Menu log, so a slow install can be
      // attributed to download / detection / device / install instead of guessed.
      let lastMark = Date.now();
      const timing: string[] = [];
      const mark = (label: string) => {
        const now = Date.now();
        timing.push(`${label} ${((now - lastMark) / 1000).toFixed(1)}s`);
        lastMark = now;
      };
      const logTiming = (outcome: string) => {
        const line = `${outcome} — ${timing.join(' · ')} — ${localFilePath ?? appURI}`;
        MenuBarModule.logs.push({ command: 'install-app', info: line });
        console.log(`[install-app] ${line}`);
      };

      try {
        if (!localFilePath) {
          createTask({
            id: appURI,
            status: MenuBarStatus.DOWNLOADING,
            progress: 0,
            // The device that the build probably goes to. The task moves when the type of the
            // build shows that it goes to another device.
            deviceId: deviceId ?? selectedDevicesIds[getPlatformFromURI(appURI)],
          });
          const buildPath = await downloadBuildAsync(appURI, (progress) => {
            updateTask({ id: appURI, progress });
          });
          localFilePath = buildPath;
          mark('download');
        }

        let devicePlatform: DevicePlatform = getPlatformFromURI(appURI);
        let appType: Device['deviceType'] | undefined;
        let appInfo: Awaited<ReturnType<typeof detectAppleAppTypeAsync>> | undefined;

        if (devicePlatform === 'ios') {
          appInfo = await detectAppleAppTypeAsync(localFilePath);
          mark('detect');
          appType = appInfo.deviceType;
          if (appInfo.osType === 'macOS') {
            if (tasks.get(appURI)) {
              // A Mac app goes to no device row.
              updateTask({ id: appURI, status: MenuBarStatus.INSTALLING_APP, deviceId: undefined });
            } else {
              createTask({ id: appURI, status: MenuBarStatus.INSTALLING_APP, progress: 0 });
            }

            try {
              await installAndLaunchAppAsync({
                appPath: localFilePath,
                deviceId: undefined,
                launchURL,
              });
            } catch (error) {
              if (error instanceof Error) {
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
            return;
          } else if (appInfo.osType === 'tvOS') {
            devicePlatform = 'tvos';
          } else if (appInfo.osType === 'watchOS') {
            devicePlatform = 'watchos';
          }
        }

        let device: PlatformToDevice<typeof devicePlatform> | undefined;
        if (deviceId) {
          const requested = findDeviceById(deviceId);
          if (
            !requested ||
            getDeviceOS(requested) !== devicePlatform ||
            (appType && requested.deviceType !== appType)
          ) {
            warnDeviceIdNotFound(deviceId);
          } else {
            device = requested as PlatformToDevice<typeof devicePlatform>;
            persistSelectedDevice(requested);
          }
        }
        if (!device) {
          device = getDeviceByPlatform(devicePlatform, appType);
        }
        if (!device) {
          Alert.alert(
            `You don't have any ${devicePlatform} device available to run this build, please make sure your environment is configured correctly and try again.`
          );
          return;
        }
        const resolvedDeviceId = getDeviceId(device);

        createTask({
          id: appURI,
          status: MenuBarStatus.BOOTING_DEVICE,
          progress: 0,
          deviceId: resolvedDeviceId,
        });
        await ensureDeviceIsRunning(device);

        // Offer to resign the build for this device. Used both before the install
        // (when the embedded profile already rules it out) and after a failed one.
        const offerResign = (title: string, message: string) => {
          const deviceName = device!.name ?? 'iPhone';
          const ipaPath = localFilePath!;
          const runResign = async () => {
            MenuBarModule.openPopover();
            const resignTaskId = `resign:${ipaPath}`;
            // Progress is stitched: fixed percentages per step, plus a slow creep
            // during the opaque codesigning phase so the bar never looks frozen.
            // Kept monotonic across step repeats.
            let lastProgress = 0;
            let creepTimer: ReturnType<typeof setInterval> | undefined;
            const clearCreep = () => {
              if (creepTimer) {
                clearInterval(creepTimer);
                creepTimer = undefined;
              }
            };
            createTask({
              id: resignTaskId,
              status: MenuBarStatus.RESIGNING_APP,
              progress: 0,
              message: describeResignStep('inspecting'),
              deviceId: resolvedDeviceId,
            });
            try {
              await resignAndRetryAsync({
                localFilePath: ipaPath,
                deviceId: resolvedDeviceId,
                deviceName,
                bundleId: appInfo?.bundleIdentifier,
                launchURL,
                sourceUri: appURI.startsWith('https://') ? appURI : undefined,
                onProgress: (step) => {
                  clearCreep();
                  const target = resignStepProgress(step);
                  if (target === undefined) {
                    // Orbit-side waiting steps: back to indeterminate.
                    lastProgress = 0;
                  } else {
                    lastProgress = Math.max(lastProgress, target);
                  }
                  updateTask({
                    id: resignTaskId,
                    status: MenuBarStatus.RESIGNING_APP,
                    progress: lastProgress,
                    message: describeResignStep(step),
                  });
                  if (step === 'codesigning') {
                    creepTimer = setInterval(() => {
                      if (lastProgress < 92) {
                        lastProgress += 1;
                        updateTask({ id: resignTaskId, progress: lastProgress });
                      }
                    }, 250);
                  }
                },
              });
            } catch (resignError) {
              if (
                resignError instanceof InternalError &&
                resignError.code === 'APPLE_DEVICE_LOCKED'
              ) {
                Alert.alert(
                  'Unlock your device and try again',
                  'Your iPhone needs to be unlocked so the developer ' +
                    'tooling can mount and install the resigned app.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Retry',
                      style: 'default',
                      onPress: () => {
                        runResign();
                      },
                    },
                  ]
                );
              } else {
                const copy = describeResignError(resignError);
                Alert.alert(copy.title, copy.message);
              }
            } finally {
              clearCreep();
              deleteTask(resignTaskId);
            }
          };
          Alert.alert(title, message, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Resign and install', style: 'default', onPress: runResign },
          ]);
        };

        // The embedded provisioning profile already tells whether this build can
        // install on the device (expired, device not listed, App Store build).
        // A failing device install is slow, so skip it and offer the resign now.
        mark('device-ready');
        if (getDeviceOS(device) === 'ios' && !isVirtualDevice(device) && appInfo?.provisioning) {
          const reason = resignReasonForDevice(appInfo.provisioning, resolvedDeviceId);
          if (reason) {
            logTiming(`pre-check: ${reason} (${appInfo.provisioning.kind}) → resign offer`);
            const copy = describeResignReason(reason, {
              deviceName: device.name ?? 'iPhone',
              expiresAt: appInfo.provisioning.expiresAt,
            });
            offerResign(copy.title, copy.message);
            return;
          }
          timing.push(`pre-check ok (${appInfo.provisioning.kind})`);
        } else {
          timing.push(appInfo?.provisioning ? 'pre-check n/a' : 'pre-check skipped (no profile)');
        }

        // One retry after freeing a free-Apple-ID app slot; every other outcome
        // ends the loop, so the trust / locked handling below covers the retry.
        for (let installAttempt = 0; ; installAttempt++) {
          try {
            updateTask({ id: appURI, status: MenuBarStatus.INSTALLING_APP });
            await installAndLaunchAppAsync({
              appPath: localFilePath,
              deviceId: resolvedDeviceId,
              launchURL,
            });
            mark('install');
            logTiming('installed');
          } catch (error) {
            mark('install');
            logTiming(
              `install failed: ${error instanceof InternalError ? error.code : (error as Error)?.message}`
            );
            if (error instanceof InternalError) {
              if (error.code === 'APPLE_DEVICE_LOCKED') {
                Alert.alert(
                  'Please unlock your device and open the app manually',
                  'We were unable to launch your app because the device is currently locked.'
                );
              } else if (error.code === 'APPLE_DEVELOPER_NOT_TRUSTED') {
                // Installed, but iOS won't open it until the user trusts the
                // developer certificate on the device (first run of a dev build
                // signed with their own account). Walk them through it and launch.
                await handleUntrustedDeveloperAsync({
                  appPath: localFilePath!,
                  deviceId: resolvedDeviceId,
                  launchURL,
                });
              } else if (error.code === 'APPLE_FREE_APP_LIMIT_REACHED') {
                // Three free-Apple-ID apps are already on the device. Offer to
                // remove one Orbit installed, then install once more.
                const freed =
                  resolvedDeviceId &&
                  (await handleFreeAppLimitAsync({
                    deviceId: resolvedDeviceId,
                    deviceName: device.name ?? 'iPhone',
                    appName: localFilePath!
                      .split(/[\\/]/)
                      .pop()!
                      .replace(/\.(ipa|app)$/i, ''),
                    occupyingApps: (
                      error.details as { apps?: { bundleId: string; name?: string }[] } | undefined
                    )?.apps,
                  }));
                if (freed && installAttempt === 0) continue;
              } else if (error.code === 'APPLE_DEVICE_CONNECTION_LOST') {
                // The CLI already retried the devicectl connection; the message
                // carries the cable / Wi-Fi / unlock checks.
                Alert.alert('Lost connection to your device', error.message);
              } else if (error.code === 'APPLE_APP_VERIFICATION_FAILED') {
                if (getDeviceOS(device) !== 'ios' || isVirtualDevice(device)) {
                  Alert.alert(
                    error.message,
                    'Confirm that this is an internal distribution build and that your device was provisioned to use this build.'
                  );
                } else {
                  offerResign(
                    "This build isn't signed for your device",
                    'Orbit can resign it with your Apple ID and retry.'
                  );
                }
              }
            } else {
              throw error;
            }
          }
          break;
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
            apps.map((app) => {
              let label = app.name;
              if (app.osType) {
                label += ` - ${app.osType}`;
              }
              if (app.deviceType) {
                label += ` (${app.deviceType})`;
              }
              return label;
            })
          );

          await installAppFromURI(apps[selectedAppNameIndex].path);
        } else if (error instanceof InternalError && error.code === 'UNTRUSTED_SOURCE') {
          alertUntrustedSource(error);
        } else if (error instanceof Error) {
          if (__DEV__) {
            console.log('Something went wrong while installing the app.', error.message);
            console.log(`Stack: ${error.stack}`);
          }
          Alert.alert('Something went wrong while installing the app.', error.message);
        }
      } finally {
        launchingBuilds.current.delete(appURI);
        setTimeout(() => {
          deleteTask(appURI);
        }, 2000);
      }
    },
    [
      selectedDevicesIds,
      ensureDeviceIsRunning,
      getDeviceByPlatform,
      getRemoteTarget,
      installOnRemoteSimulator,
      findDeviceById,
      warnDeviceIdNotFound,
      persistSelectedDevice,
      createTask,
      deleteTask,
      updateTask,
      tasks,
    ]
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
                handleExpoGoUrl(url, deeplinkInfo.sdkVersion, deeplinkInfo.deviceId);
                break;
              case URLType.SNACK:
                Analytics.track(Event.LAUNCH_SNACK);
                handleExpoGoUrl(url);
                break;
              case URLType.EXPO_UPDATE:
                Analytics.track(Event.LAUNCH_EXPO_UPDATE);
                handleUpdateUrl(url, deeplinkInfo.deviceId);
                break;
              case URLType.EXPO_BUILD:
                Analytics.track(Event.LAUNCH_BUILD);
                installAppFromURI(url, deeplinkInfo.launchURL, deeplinkInfo.deviceId);
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

  // The label of a device in the Default control and in its menu.
  const getDefaultDeviceTitle = (device: Device) =>
    isRemoteDevice(device) ? `${getRemoteSimulatorDeviceName(device)} (remote)` : device.name;

  // The devices that can be the default of a section: all its devices, not only the visible
  // ones, then the Expo Simulators sessions of the same platform.
  const getDefaultCandidates = (key: string): Device[] => [
    ...getOrderedDevices(
      key,
      (sections.find((section) => section.key === key)?.data ?? []) as Device[]
    ),
    ...remoteSessions.filter((session) => getDeviceOS(session) === key),
  ];

  // A click on the icon of a row: the device becomes the default of its platform. A click on
  // the icon of the default device removes the default.
  const toggleDefaultDevice = (device: Device) => {
    if (!isValidDevice(device)) {
      return;
    }
    const platform = getDeviceOS(device);
    const id = getDeviceId(device);
    setSelectedDevicesIds((prev) => {
      const newValue = { ...prev, [platform]: prev[platform] === id ? undefined : id };
      saveSelectedDevicesIds(newValue);
      return newValue;
    });
  };

  // The user dropped a row at a new position. `visibleIds` are the rows that show. The devices
  // behind "Show N more…" keep their order after them.
  const moveDevice = (key: string, visibleIds: string[], from: number, to: number) => {
    const allIds = getOrderedDevices(
      key,
      (sections.find((section) => section.key === key)?.data ?? []) as Device[]
    ).map(getDeviceId);
    const moved = moveItem(visibleIds, from, to);
    updateDeviceList((prev) => ({
      ...prev,
      order: { ...prev.order, [key]: [...moved, ...allIds.filter((id) => !moved.includes(id))] },
    }));
  };

  // The menu of a device row, on a click with the right mouse button.
  const showDeviceMenu = async (key: string, device: Device) => {
    const id = getDeviceId(device);
    const hasOrder = !!deviceList.order[key]?.length;
    const index = await MenuBarModule.showMenu([
      { title: device.name, header: true },
      { title: 'Hide from this list' },
      ...(hasOrder ? [{ separator: true }, { title: 'Reset the order of this section' }] : []),
    ]);
    if (index === 1) {
      updateDeviceList((prev) => ({ ...prev, hidden: [...prev.hidden, id] }));
      // A hidden device is not the default device.
      const platform = getDeviceOS(device);
      setSelectedDevicesIds((prev) => {
        if (prev[platform] !== id) {
          return prev;
        }
        const newValue = { ...prev, [platform]: undefined };
        saveSelectedDevicesIds(newValue);
        return newValue;
      });
    } else if (index === 3) {
      updateDeviceList((prev) => {
        const { [key]: _removed, ...order } = prev.order;
        return { ...prev, order };
      });
    }
  };

  // The menu of the default controller, in the header of the Remote devices section.
  const chooseRemoteController = async () => {
    const index = await MenuBarModule.showMenu([
      { title: 'Default controller', header: true },
      ...REMOTE_SIMULATOR_CONTROLLERS.map(({ id, label }) => ({
        title: label,
        checked: id === remoteController.id,
      })),
    ]);
    const controller = REMOTE_SIMULATOR_CONTROLLERS[index - 1];
    if (controller) {
      saveLastRemoteSimulatorController(controller.id);
      setRemoteController(controller);
    }
  };

  // Expo Simulators can be the default of a platform that a session can run.
  const canDefaultToRemote = (key: string) =>
    remoteStatus === 'ready' && (key === 'ios' || key === 'android');

  const getDefaultLabel = (key: string) => {
    const selectedId = selectedDevicesIds[key as DevicePlatform];
    const newSessionDevice = getNewRemoteSessionDevice(selectedId);
    if (newSessionDevice) {
      const model = SUGGESTED_REMOTE_DEVICES[key as 'ios' | 'android']?.find(
        ({ id }) => id === newSessionDevice
      );
      return canDefaultToRemote(key) ? `${model?.label ?? newSessionDevice} (remote)` : undefined;
    }
    const device = getDefaultCandidates(key).find((device) => getDeviceId(device) === selectedId);
    return device && getDefaultDeviceTitle(device);
  };

  // The menu of the default device: the local devices, then the Expo Simulators choices.
  const chooseDefaultDevice = async (key: string) => {
    const platform = key as DevicePlatform;
    const selectedId = selectedDevicesIds[platform];
    const sectionLabel = sections.find((section) => section.key === key)?.label ?? '';
    const choices: (MenuItem & { id?: string; device?: Device })[] = [
      // The title of the menu.
      { title: `Default ${sectionLabel} device`, header: true },
      ...getDefaultCandidates(key)
        .filter((device) => !isRemoteDevice(device))
        .map((device) => ({
          title: device.name,
          detail: 'osVersion' in device ? device.osVersion : undefined,
          id: getDeviceId(device),
          device,
        })),
    ];
    if (canDefaultToRemote(key)) {
      choices.push(
        { separator: true },
        { title: 'Remote devices', header: true },
        // A new session on this device model for each build.
        ...SUGGESTED_REMOTE_DEVICES[key as 'ios' | 'android'].map(({ id, label }) => ({
          title: label,
          detail: 'new session for each build',
          id: getNewRemoteSessionId(id),
        })),
        ...remoteSessions
          .filter((session) => getDeviceOS(session) === key)
          .map((session) => ({
            title: session.state === 'Starting' ? 'Starting session' : 'Running session',
            detail:
              session.accountName && session.projectSlug
                ? `${session.accountName}/${session.projectSlug}`
                : undefined,
            id: session.id,
            device: session as Device,
          }))
      );
    }
    choices.push({ separator: true }, { title: 'None' });

    const index = await MenuBarModule.showMenu(
      choices.map(({ id, device, ...item }) => ({
        ...item,
        checked: !item.separator && !item.header && id === selectedId,
      }))
    );
    const choice = choices[index];
    if (!choice || (choice.device && !isValidDevice(choice.device))) {
      return;
    }
    setSelectedDevicesIds((prev) => {
      const newValue = { ...prev, [platform]: choice.id };
      saveSelectedDevicesIds(newValue);
      return newValue;
    });
  };

  return (
    <View shrink="1" testID="popover-core">
      <AccountRow {...accountState} />
      <TasksSection tasks={otherTasks} />
      {showProjects ? (
        <ProjectsSection
          apps={apps}
          accountName={selectedAccountName}
          installAppFromURI={installAppFromURI}
        />
      ) : null}
      {showBuilds ? <BuildsSection installAppFromURI={installAppFromURI} /> : null}
      {isEverythingHidden ? <EverythingHidden /> : null}
      {attention ? <ResignedAppsAttentionRow attention={attention} /> : null}
      <View shrink="1" pt="tiny" overflow="hidden">
        {devicesError ? (
          <DevicesListError error={devicesError} />
        ) : (
          <SectionList<Device, Omit<(typeof visibleSections)[number], 'data'>>
            sections={visibleSections}
            style={{ minHeight: estimatedListHeight }}
            contentContainerStyle={{ width: '100%' }}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(device) => {
              const id = getDeviceId(device);
              return remoteRowKeys.current.get(id) ?? id;
            }}
            SectionSeparatorComponent={Separator}
            renderSectionHeader={({ section: { key, label, error } }) => {
              const hasChoices =
                key !== 'remote' &&
                (getDefaultCandidates(key).length > 0 || canDefaultToRemote(key));
              return (
                <DeviceListSectionHeader
                  label={label}
                  errorMessage={error?.message}
                  // The other sections show the default device. Remote devices shows the
                  // default controller of a session.
                  defaultLabel={key === 'remote' ? remoteController.label : getDefaultLabel(key)}
                  onPressDefault={
                    key === 'remote'
                      ? remoteStatus === 'ready'
                        ? chooseRemoteController
                        : undefined
                      : hasChoices
                        ? () => chooseDefaultDevice(key)
                        : undefined
                  }
                />
              );
            }}
            renderSectionFooter={({
              section: { key, error, hiddenCount, isExpanded, emptyText, addItem, gap },
            }) => (
              <>
                {emptyText ? (
                  <View
                    px="medium"
                    style={{ height: SECTION_TOGGLE_HEIGHT, justifyContent: 'center' }}
                    testID={`empty-section-${key}`}>
                    <Text size="tiny" style={secondaryText}>
                      {emptyText}
                    </Text>
                  </View>
                ) : null}
                {hiddenCount ? (
                  <TouchableOpacity
                    style={{ height: SECTION_TOGGLE_HEIGHT, justifyContent: 'center' }}
                    onPress={() =>
                      setExpandedSections((prev) => {
                        const next = new Set(prev);
                        if (!next.delete(key)) next.add(key);
                        return next;
                      })
                    }
                    testID={`toggle-section-${key}`}>
                    <View px="medium">
                      <Text size="tiny" style={secondaryText}>
                        {isExpanded ? 'Show fewer' : `Show ${hiddenCount} more…`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null}
                {addItem ? (
                  <AddDeviceItem
                    {...addItem}
                    onPress={
                      key === 'android'
                        ? () => WindowsNavigator.open('PairAndroidDevice')
                        : startRemoteSimulator
                    }
                    testID={`add-device-${key}`}
                  />
                ) : null}
                {key === 'ios' && error?.code === 'APPLE_DEVICE_USBMUXD_NOT_RUNNING' ? (
                  <AppleDeviceHelperPrompt error={error} onInstalled={refetch} />
                ) : null}
                <View style={{ height: gap }} />
              </>
            )}
            renderItem={({ item: device, index, section }) => {
              const platform = getDeviceOS(device);
              const id = getDeviceId(device);
              const sectionKey = section.key;
              const canChange = sectionKey !== 'remote';
              // A session that ended stays in the list until the user archives it.
              const isEnded = isRemoteDevice(device) && isEndedRemoteSession(device);
              const isStopping = !isEnded && stoppingDeviceIds.has(id);
              const isDragTarget =
                drag?.key === sectionKey && drag.to === index && drag.to !== drag.from;
              return (
                <DeviceItem
                  device={device}
                  key={device.name}
                  status={
                    isStopping
                      ? 'Stopping...'
                      : // The task of a launch stays for a moment after the launch ends. A session
                        // that ended does not show it.
                        deviceTasks.has(id) && !isEnded
                        ? getDeviceStatus(deviceTasks.get(id)!)
                        : undefined
                  }
                  isDragged={drag?.key === sectionKey && drag.from === index}
                  dropLine={isDragTarget ? (drag.to < drag.from ? 'above' : 'below') : undefined}
                  reorder={
                    canChange && section.data.length > 1
                      ? {
                          onMove: (rows) => {
                            const to = Math.max(0, Math.min(section.data.length - 1, index + rows));
                            setDrag((prev) =>
                              prev?.key === sectionKey && prev.from === index && prev.to === to
                                ? prev
                                : { key: sectionKey, from: index, to }
                            );
                          },
                          onEnd: (rows) => {
                            const to = Math.max(0, Math.min(section.data.length - 1, index + rows));
                            setDrag(undefined);
                            if (to !== index) {
                              moveDevice(sectionKey, section.data.map(getDeviceId), index, to);
                            }
                          },
                          onCancel: () => setDrag(undefined),
                        }
                      : undefined
                  }
                  onContextMenu={canChange ? () => showDeviceMenu(sectionKey, device) : undefined}
                  isDefault={!isEnded && selectedDevicesIds[platform] === id}
                  onPressDefault={
                    isEnded || (isRemoteDevice(device) && isPendingRemoteSession(device))
                      ? undefined
                      : () => toggleDefaultDevice(device)
                  }
                  onPressLaunch={async () => {
                    Analytics.track(Event.LAUNCH_SIMULATOR);
                    if (isRemoteDevice(device)) {
                      await bootRemoteSimulator(platform as 'ios' | 'android');
                      return;
                    }
                    await bootDeviceAsync({ platform, id, audio: !emulatorWithoutAudio });
                    refetch();
                  }}
                  {...(isVirtualDevice(device) && {
                    // A local simulator or emulator that runs: show its window, or stop it.
                    onPressOpen: () => {
                      bootDeviceAsync({ platform, id, audio: !emulatorWithoutAudio }).catch(
                        (error) => Alert.alert('Could not show the device', error.message)
                      );
                      MenuBarModule.closePopover();
                    },
                    onPressStop: async () => {
                      setIsStopping(id, true);
                      try {
                        await stopDeviceAsync({ platform, id });
                      } catch (error) {
                        if (error instanceof Error) {
                          Alert.alert('Could not stop the device', error.message);
                        }
                      }
                      await refetch();
                      setIsStopping(id, false);
                    },
                  })}
                  {...(isRemoteDevice(device) &&
                    !isPendingRemoteSession(device) && {
                      // The page of the session on expo.dev. It also shows a session that ended.
                      onPressOpen: () => {
                        const url = getRemoteSimulatorSessionUrl(device);
                        if (url) {
                          Linking.openURL(url);
                          MenuBarModule.closePopover();
                        }
                      },
                      ...(isEnded
                        ? { onPressArchive: () => archiveRemoteSession(device.id) }
                        : // No question before the stop: the button says what it does.
                          { onPressStop: () => stopRemoteSimulator(device) }),
                    })}
                  // No second stop while the first one runs.
                  {...(isStopping && { onPressStop: undefined })}
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
