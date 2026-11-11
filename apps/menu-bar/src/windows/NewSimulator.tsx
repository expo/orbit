import { RemoteSimulatorOption, RemoteSimulatorOptions } from 'common-types/build/devices';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { WindowsNavigator } from './index';
import { withApolloProvider } from '../api/ApolloClient';
import {
  listRemoteSimulatorOptionsAsync,
  listRemoteSimulatorsAsync,
} from '../commands/remoteSimulatorAsync';
import { Row, Text, View } from '../components';
import { useGetPinnedApps } from '../hooks/useGetPinnedApps';
import Alert from '../modules/Alert';
import { DeviceEventEmitter } from '../modules/DeviceEventEmitter';
import MenuBarModule from '../modules/MenuBarModule';
import { PlatformColor } from '../modules/PlatformColor';
import {
  getLastRemoteSimulatorAppId,
  getLastRemoteSimulatorController,
  getSelectedAccountName,
  saveLastRemoteSimulatorController,
} from '../modules/Storage';
import { useTheme } from '../providers/ThemeProvider';
import {
  RemoteSimulatorProject,
  START_REMOTE_SIMULATOR_EVENT,
  SUGGESTED_REMOTE_DEVICES,
  StartRemoteSimulatorRequest,
  formatRelativeTime,
  getRemoteSimulatorProjects,
  parseLaunchArgs,
  parseTags,
} from '../utils/remoteSimulator';

type Platform = 'ios' | 'android';
type BuildSource = 'build' | 'expo-go' | 'url' | 'none';

const BUILD_SOURCES: { id: BuildSource; label: string }[] = [
  { id: 'build', label: 'Latest app build' },
  { id: 'expo-go', label: 'Expo Go' },
  { id: 'url', label: 'From URL' },
  { id: 'none', label: 'No build' },
];
// Orbit installs builds on a session only through Agent Device.
const CONTROLLERS = [
  { id: 'web-preview-only', label: 'None (web preview only)' },
  { id: 'agent-device', label: 'Agent Device' },
  { id: 'argent', label: 'Argent' },
  { id: 'appium', label: 'Appium' },
];

// The fields follow the "Create new simulator" dialog on expo.dev, plus the project, which the
// website takes from the page.
const NewSimulator = () => {
  const theme = useTheme();
  const fieldStyle = [
    styles.field,
    { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)' },
  ];

  const { pinnedApps, accounts } = useGetPinnedApps();
  const [remoteAccounts, setRemoteAccounts] = useState<{ id: string; name: string }[]>();
  useEffect(() => {
    listRemoteSimulatorsAsync()
      .then((list) => setRemoteAccounts(list.accounts))
      .catch(() => setRemoteAccounts([]));
  }, []);
  const projects = useMemo(
    () =>
      getRemoteSimulatorProjects({
        remoteAccounts: remoteAccounts ?? [],
        accounts,
        pinnedApps,
        lastAppId: getLastRemoteSimulatorAppId(),
      }),
    [remoteAccounts, accounts, pinnedApps]
  );

  const [projectId, setProjectId] = useState<string>();
  // With no choice: the last project if it is in the account that is selected in the
  // popover, then the first project of that account, then the first project.
  const selectedAccountName = getSelectedAccountName();
  const isInSelectedAccount = ({ label }: RemoteSimulatorProject) =>
    !!selectedAccountName && label.startsWith(`${selectedAccountName}/`);
  const project =
    projects.find(({ id }) => id === projectId) ??
    (projects[0] && isInSelectedAccount(projects[0]) ? projects[0] : undefined) ??
    projects.find(isInSelectedAccount) ??
    projects[0];

  const [options, setOptions] = useState<RemoteSimulatorOptions>();
  const [optionsError, setOptionsError] = useState(false);
  const selectedProjectId = project?.id;
  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }
    let isCurrent = true;
    setOptions(undefined);
    setOptionsError(false);
    listRemoteSimulatorOptionsAsync(selectedProjectId)
      .then((result) => isCurrent && setOptions(result))
      .catch(() => isCurrent && setOptionsError(true));
    return () => {
      isCurrent = false;
    };
  }, [selectedProjectId]);

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<Platform>('ios');
  const [deviceId, setDeviceId] = useState<string>();
  const [buildSource, setBuildSource] = useState<BuildSource>('build');
  const [buildId, setBuildId] = useState<string>();
  const [sdkVersion, setSdkVersion] = useState<string>();
  const [archiveUrl, setArchiveUrl] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  // No controller at first. After that, the controller that the user chose last.
  const [controller, setController] = useState(() => {
    const last = getLastRemoteSimulatorController();
    return CONTROLLERS.find(({ id }) => id === last)?.id ?? CONTROLLERS[0].id;
  });
  const [launchArgs, setLaunchArgs] = useState('');
  const [tags, setTags] = useState('');

  // The suggested models come first, in their order. The other models keep the order of the API.
  const suggestedIds = SUGGESTED_REMOTE_DEVICES[platform].map(({ id }) => id);
  const devices = [...(options?.devices[platform] ?? [])].sort((a, b) => {
    const rank = (id: string) => suggestedIds.indexOf(id) + 1 || suggestedIds.length + 1;
    return rank(a.id) - rank(b.id);
  });
  const builds = options?.builds[platform] ?? [];
  const sdkVersions = options?.expoGoSdkVersions ?? [];
  // With no choice, the device is the first suggested model that Expo Simulators has.
  const device =
    devices.find(({ id }) => id === deviceId) ??
    devices.find(({ id }) => id === SUGGESTED_REMOTE_DEVICES[platform][0].id) ??
    devices[0];
  const build = builds.find(({ id }) => id === buildId) ?? builds[0];
  const sdk = sdkVersions.find(({ id }) => id === sdkVersion) ?? sdkVersions[0];

  const choose = async <T extends { id: string; label: string; createdAt?: string }>(
    items: T[],
    selectedId: string | undefined,
    onChoose: (item: T | undefined) => void,
    emptyLabel?: string
  ) => {
    const index = await MenuBarModule.showMenu([
      ...(emptyLabel ? [{ title: emptyLabel, checked: !selectedId }, { separator: true }] : []),
      ...items.map((item) => ({
        title: item.label,
        detail: item.createdAt ? formatRelativeTime(item.createdAt) : undefined,
        checked: item.id === selectedId,
      })),
    ]);
    if (index < 0) {
      return;
    }
    onChoose(emptyLabel ? items[index - 2] : items[index]);
  };

  const hasStarted = useRef(false);
  const onPressStart = () => {
    if (!project) {
      return;
    }
    const parsedLaunchArgs = parseLaunchArgs(launchArgs);
    const parsedTags = parseTags(tags);
    const error =
      parsedLaunchArgs.error ??
      parsedTags.error ??
      (buildSource === 'url' && !/^https:\/\/\S+$/.test(archiveUrl.trim())
        ? 'Enter the https URL of a build.'
        : buildSource === 'build' && !build
          ? `This project has no ${platform === 'ios' ? 'iOS simulator' : 'Android APK'} build. Select a different build source.`
          : undefined);
    if (error) {
      Alert.alert('Cannot start the session', error);
      return;
    }

    const request: StartRemoteSimulatorRequest = {
      platform,
      project,
      options: {
        name: name.trim() || undefined,
        deviceIdentifier: device?.id,
        buildId: buildSource === 'build' ? build?.id : undefined,
        expoGo: buildSource === 'expo-go' || undefined,
        sdkVersion: buildSource === 'expo-go' ? sdk?.id : undefined,
        archiveUrl: buildSource === 'url' ? archiveUrl.trim() : undefined,
        launchArgs: buildSource === 'none' ? undefined : parsedLaunchArgs.value,
        tags: parsedTags.value,
        sessionType: controller,
      },
    };
    // One request for each window: a second click must not start a second session.
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;
    DeviceEventEmitter.emit(START_REMOTE_SIMULATOR_EVENT, request);
    WindowsNavigator.close('NewSimulator');
  };

  const menuField = (label: string, onPress: () => void, isPlaceholder = false) => (
    <TouchableOpacity style={fieldStyle} onPress={onPress}>
      <Text numberOfLines={1} style={[styles.fieldText, isPlaceholder && styles.placeholder]}>
        {label}
      </Text>
      <SymbolView
        name="chevron.up.chevron.down"
        size={11}
        tintColor={PlatformColor('labelColor')}
        fallback={<Text size="tiny">▾</Text>}
      />
    </TouchableOpacity>
  );
  const textField = (value: string, onChangeText: (text: string) => void, placeholder: string) => (
    <View style={fieldStyle}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={PlatformColor('placeholderTextColor')}
        autoCorrect={false}
        // @ts-expect-error `enableFocusRing` is a react-native-macos prop.
        enableFocusRing={false}
        style={[styles.fieldText, styles.textInput]}
      />
    </View>
  );
  const loadingField = (text: string) => (
    <Row style={fieldStyle} gap="2">
      {optionsError ? null : <ActivityIndicator size="small" />}
      <Text style={[styles.fieldText, styles.placeholder]}>{text}</Text>
    </Row>
  );
  const optionsUnavailable = optionsError
    ? loadingField('Orbit could not load the choices')
    : !options
      ? loadingField('Loading…')
      : undefined;

  if (remoteAccounts && !projects.length) {
    return (
      <View flex="1" px="medium" py="medium" align="centered">
        <Text align="center" style={styles.label}>
          Orbit found no pinned or recent project in an account with access to Expo Simulators.
        </Text>
      </View>
    );
  }

  return (
    <View flex="1" testID="new-simulator-window">
      <ScrollView alwaysBounceVertical={false} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Project</Text>
        {project
          ? menuField(project.label, () =>
              choose(projects, project.id, (item?: RemoteSimulatorProject) => {
                setProjectId(item?.id);
                setBuildId(undefined);
              })
            )
          : loadingField('Loading…')}

        <Text style={styles.label}>
          Session name <Text style={[styles.label, styles.placeholder]}>(optional)</Text>
        </Text>
        {textField(name, setName, 'Started from Orbit')}

        <Text style={styles.label}>Device</Text>
        <Row style={[fieldStyle, styles.segments]}>
          {(['ios', 'android'] as const).map((value) => (
            <TouchableOpacity
              key={value}
              onPress={() => {
                setPlatform(value);
                setDeviceId(undefined);
                setBuildId(undefined);
              }}
              style={[
                styles.segment,
                platform === value && {
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,.22)' : '#ffffff',
                },
              ]}>
              <Text style={styles.segmentText} weight={platform === value ? 'semibold' : 'normal'}>
                {value === 'ios' ? 'iOS' : 'Android'}
              </Text>
            </TouchableOpacity>
          ))}
        </Row>
        <View style={styles.gap} />
        {optionsUnavailable ??
          menuField(
            device?.label ?? 'No device found',
            () =>
              choose(devices, device?.id, (item?: RemoteSimulatorOption) => setDeviceId(item?.id)),
            !device
          )}

        <Text style={styles.label}>Build source</Text>
        {menuField(BUILD_SOURCES.find(({ id }) => id === buildSource)!.label, () =>
          choose(BUILD_SOURCES, buildSource, (item) => item && setBuildSource(item.id))
        )}
        {buildSource === 'none' ? null : <View style={styles.gap} />}
        {buildSource === 'build'
          ? (optionsUnavailable ??
            menuField(
              build
                ? `${build.label}${build.createdAt ? ` · ${formatRelativeTime(build.createdAt)}` : ''}`
                : `No ${platform === 'ios' ? 'iOS simulator' : 'Android APK'} build in this project`,
              () => choose(builds, build?.id, (item) => setBuildId(item?.id)),
              !build
            ))
          : null}
        {buildSource === 'expo-go'
          ? (optionsUnavailable ??
            menuField(sdk?.label ?? 'Latest SDK', () =>
              choose(sdkVersions, sdk?.id, (item) => setSdkVersion(item?.id))
            ))
          : null}
        {buildSource === 'url'
          ? textField(
              archiveUrl,
              setArchiveUrl,
              platform === 'ios' ? 'https://… .tar.gz' : 'https://… .apk'
            )
          : null}

        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setIsAdvancedOpen((isOpen) => !isOpen)}>
          <Text style={styles.label}>Advanced options {isAdvancedOpen ? '▴' : '▾'}</Text>
        </TouchableOpacity>
        {isAdvancedOpen ? (
          <>
            <Text style={[styles.label, styles.firstLabel]}>Controller</Text>
            {menuField(CONTROLLERS.find(({ id }) => id === controller)!.label, () =>
              choose(CONTROLLERS, controller, (item) => {
                if (item) {
                  setController(item.id);
                  saveLastRemoteSimulatorController(item.id);
                }
              })
            )}
            {controller === 'agent-device' ? null : (
              <Text style={styles.hint}>
                Orbit can install builds on a running session only with Agent Device.
              </Text>
            )}
            <View style={styles.gap} />
            {textField(launchArgs, setLaunchArgs, 'Launch arguments (optional)')}
            <View style={styles.gap} />
            {textField(tags, setTags, 'Tags (optional), separated by commas')}
          </>
        ) : null}
      </ScrollView>

      <View px="medium" pb="medium" pt="2">
        <Text style={styles.hint}>The session uses your Expo plan.</Text>
        <Pressable
          style={({ pressed }) => [styles.startButton, (pressed || !project) && styles.disabled]}
          disabled={!project}
          onPress={onPressStart}
          testID="new-simulator-start">
          <Text weight="semibold" style={styles.startButtonText}>
            Start session
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default withApolloProvider(NewSimulator);

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  label: { fontSize: 12, marginTop: 14, marginBottom: 5, color: PlatformColor('labelColor') },
  firstLabel: { marginTop: 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  fieldText: { flex: 1, fontSize: 13, color: PlatformColor('labelColor') },
  textInput: { height: 18, paddingVertical: 0, backgroundColor: 'transparent' },
  placeholder: { opacity: 0.55 },
  segments: { paddingHorizontal: 3, gap: 3 },
  segment: {
    flex: 1,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  segmentText: { fontSize: 13, color: PlatformColor('labelColor') },
  gap: { height: 6 },
  advancedToggle: { alignSelf: 'flex-start' },
  hint: { fontSize: 11, marginTop: 5, opacity: 0.6, color: PlatformColor('labelColor') },
  startButton: {
    height: 32,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  startButtonText: { fontSize: 13, color: '#ffffff' },
  disabled: { opacity: 0.5 },
});
