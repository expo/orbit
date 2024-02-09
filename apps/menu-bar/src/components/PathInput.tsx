import { darkTheme, lightTheme } from '@expo/styleguide-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, TextInput as NativeTextInput } from 'react-native';

import { TextInput } from './Text';
import { Row } from './View';
import * as FilePicker from '../../modules/file-picker';
import FolderIcon from '../assets/icons/folder.svg';
import { PlatformColor } from '../modules/PlatformColor';
import { addOpacity } from '../utils/theme';
import { useCurrentTheme, useExpoTheme } from '../utils/useExpoTheme';

const PathInput = React.forwardRef<NativeTextInput, React.ComponentProps<typeof TextInput>>(
  ({ onChangeText, editable, ...props }, forwardedRef) => {
    const theme = useCurrentTheme();
    const expoTheme = useExpoTheme();

    const handleSelectFolder = async () => {
      try {
        const path = await FilePicker.pickFolder();
        onChangeText?.(path);
      } catch {}
    };

    const backgroundColor =
      theme === 'light'
        ? addOpacity(lightTheme.background.default, 0.6)
        : addOpacity(darkTheme.background.default, 0.2);

    return (
      <Row
        border="light"
        rounded="medium"
        align="center"
        style={[styles.inputContainer, { backgroundColor }, !editable && styles.inputDisabled]}>
        <TextInput
          shadow="input"
          {...props}
          style={styles.input}
          placeholderTextColor={PlatformColor('placeholderTextColor')}
          ref={forwardedRef as any}
          editable={editable}
          onChangeText={onChangeText}
          numberOfLines={1}
          placeholder="Android SDK root path"
        />
        <TouchableOpacity style={styles.icon} onPress={handleSelectFolder} disabled={!editable}>
          <FolderIcon fill={expoTheme.text.default} height={18} width={18} />
        </TouchableOpacity>
      </Row>
    );
  }
);

export default PathInput;

const styles = StyleSheet.create({
  inputContainer: {
    overflow: 'hidden',
  },
  input: {
    padding: 6,
    flex: 1,
    textAlignVertical: 'center',
    justifyContent: 'center',
    textAlign: 'left',
    verticalAlign: 'middle',
    fontSize: 13,
  },
  inputDisabled: {
    opacity: 0.66,
  },
  icon: {
    paddingHorizontal: 6,
  },
});
