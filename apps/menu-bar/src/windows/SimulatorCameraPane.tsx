import { darkTheme, lightTheme } from '@expo/styleguide-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Card, Section, SettingRow } from './SettingsPanes';
import FilePickerModule from '../../modules/file-picker/src/FilePickerModule';
import { SimulatorCameraSource } from '../../modules/simulator-camera';
import { Divider, Text, TextInput, View } from '../components';
import { Switch } from '../components/Switch';
import { useSimulatorCamera } from '../hooks/useSimulatorCamera';
import MenuBarModule from '../modules/MenuBarModule';
import { PlatformColor } from '../modules/PlatformColor';
import SectionHeaderMenu from '../popover/SectionHeaderMenu';
import { describeSource, describeStatus, noSource } from '../utils/simulatorCamera';
import { addOpacity } from '../utils/theme';
import { useCurrentTheme } from '../utils/useExpoTheme';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'heic', 'gif', 'tiff', 'bmp', 'webp'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v'];

/**
 * Settings → Simulator Camera: turns the virtual camera of iOS simulators on, and picks what
 * the back and the front camera show. macOS only; the pane is not listed elsewhere.
 */
export function SimulatorCameraPane() {
  const camera = useSimulatorCamera();
  const { preferences, status, macCameras, isBusy, error } = camera;
  const frontSource = preferences.front;

  const chooseSource = async (position: 'back' | 'front') => {
    const current = position === 'back' ? preferences.back : (frontSource ?? undefined);
    const choices: {
      title: string;
      source?: SimulatorCameraSource | null;
      pick?: 'image' | 'video' | 'qr';
    }[] = [];
    if (position === 'front') {
      choices.push({ title: 'Same as back camera', source: null });
    }
    choices.push({ title: 'None', source: noSource });
    for (const macCamera of macCameras) {
      choices.push({ title: macCamera.name, source: { kind: 'macCamera', value: macCamera.id } });
    }
    if (macCameras.length === 0) {
      choices.push({ title: 'Mac camera', source: { kind: 'macCamera' } });
    }
    choices.push(
      { title: 'Image…', pick: 'image' },
      { title: 'Video…', pick: 'video' },
      { title: 'QR code…', pick: 'qr' }
    );

    const index = await MenuBarModule.showMenu(
      choices.map(({ title, source, pick }) => ({
        title,
        checked:
          source === undefined
            ? current?.kind === pick
            : position === 'front' && source === null
              ? frontSource === null
              : current?.kind === source?.kind && current?.value === source?.value,
      }))
    );
    const choice = choices[index];
    if (!choice) return;
    let source: SimulatorCameraSource | null | undefined = choice.source;
    if (choice.pick === 'image' || choice.pick === 'video') {
      try {
        const path = await FilePickerModule.pickFileWithFilenameExtension(
          choice.pick === 'image' ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS,
          'Use'
        );
        if (!path) return;
        source = { kind: choice.pick, value: path, contentMode: current?.contentMode ?? 'fill' };
      } catch {
        return; // Cancelled.
      }
    } else if (choice.pick === 'qr') {
      // The text is typed in the row below the camera; start from the current text, if any.
      source = {
        kind: 'qr',
        value: current?.kind === 'qr' ? current.value : 'Hello from Expo Orbit',
      };
    }
    if (source === undefined) return;
    if (position === 'back') {
      camera.setBackSource(source ?? noSource);
    } else {
      camera.setFrontSource(source);
    }
  };

  const chooseContentMode = async () => {
    const current = preferences.back.contentMode ?? 'fill';
    const index = await MenuBarModule.showMenu([
      { title: 'Fill the frame', checked: current === 'fill' },
      { title: 'Fit inside the frame', checked: current === 'fit' },
    ]);
    const contentMode = index === 0 ? 'fill' : index === 1 ? 'fit' : undefined;
    if (!contentMode) return;
    camera.setBackSource({ ...preferences.back, contentMode });
    if (frontSource) camera.setFrontSource({ ...frontSource, contentMode });
  };

  const backError = status?.sourceErrors.back;
  const frontError = status?.sourceErrors.front;

  return (
    <>
      <Section title="Simulator camera">
        <Card>
          <SettingRow
            title="Virtual camera in iOS simulators"
            subtitle={error ?? describeStatus(status)}>
            <Switch
              value={preferences.enabled}
              onValueChange={camera.setEnabled}
              disabled={isBusy}
            />
          </SettingRow>
        </Card>
        <Text size="tiny" color="secondary">
          Apps that run in a booted simulator see a back and a front camera, with no change to their
          code. Apps already running pick it up after a relaunch. Some libraries disable the camera
          on simulators at build time: expo-camera before 55.0.11 and react-native-vision-camera
          before 5.0 need their simulator checks removed.
        </Text>
      </Section>
      <Section title="What the cameras show">
        <Card>
          <SettingRow
            title="Back camera"
            subtitle={backError}
            below={
              preferences.back.kind === 'qr' ? (
                <QRTextInput
                  value={preferences.back.value ?? ''}
                  onCommit={(value) => camera.setBackSource({ ...preferences.back, value })}
                />
              ) : null
            }>
            <SectionHeaderMenu
              label={describeSource(preferences.back, macCameras)}
              onPress={() => chooseSource('back')}
              testID="simulator-camera-back-source"
            />
          </SettingRow>
          <Divider />
          <SettingRow
            title="Front camera"
            subtitle={frontError}
            below={
              frontSource?.kind === 'qr' ? (
                <QRTextInput
                  value={frontSource.value ?? ''}
                  onCommit={(value) => camera.setFrontSource({ ...frontSource, value })}
                />
              ) : null
            }>
            <SectionHeaderMenu
              label={frontSource ? describeSource(frontSource, macCameras) : 'Same as back camera'}
              onPress={() => chooseSource('front')}
              testID="simulator-camera-front-source"
            />
          </SettingRow>
          <Divider />
          <SettingRow
            title="Images and videos"
            subtitle="How a source that is not 16:9 fits the frame">
            <SectionHeaderMenu
              label={
                (preferences.back.contentMode ?? 'fill') === 'fit'
                  ? 'Fit inside the frame'
                  : 'Fill the frame'
              }
              onPress={chooseContentMode}
              testID="simulator-camera-content-mode"
            />
          </SettingRow>
        </Card>
      </Section>
    </>
  );
}

/** The text of a QR code source. Applied when editing ends, so a code is generated once. */
function QRTextInput({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const theme = useCurrentTheme();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const backgroundColor =
    theme === 'light'
      ? addOpacity(lightTheme.background.default, 0.6)
      : addOpacity(darkTheme.background.default, 0.2);
  const commit = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
  };
  return (
    <View border="light" rounded="medium" style={[styles.inputContainer, { backgroundColor }]}>
      <TextInput
        shadow="input"
        style={styles.input}
        value={text}
        onChangeText={setText}
        onBlur={commit}
        onSubmitEditing={commit}
        placeholder="Text of the QR code"
        placeholderTextColor={PlatformColor('placeholderTextColor')}
        numberOfLines={1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: { overflow: 'hidden' },
  input: { padding: 6, fontSize: 13, textAlign: 'left' },
});
