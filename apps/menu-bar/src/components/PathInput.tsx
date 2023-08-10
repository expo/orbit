import {
  StyleSheet,
  TouchableOpacity,
  TextInput as NativeTextInput,
} from 'react-native';
import React from 'react';

import FilePicker from '../modules/FilePickerModule';
import FolderIcon from '../assets/icons/folder.svg';
import {TextInput} from './Text';
import {Row} from './View';
import {useExpoTheme} from '../utils/useExpoTheme';

const PathInput = React.forwardRef<
  NativeTextInput,
  React.ComponentProps<typeof TextInput>
>(({onChangeText, editable, ...props}, forwardedRef) => {
  const theme = useExpoTheme();

  const handleSelectFolder = async () => {
    try {
      const path = await FilePicker.pickFolder();
      onChangeText?.(path);
    } catch (error) {}
  };

  return (
    <Row
      border="default"
      rounded="medium"
      bg={editable ? 'overlay' : 'secondary'}
      align="center"
      style={[styles.inputContainer, !editable && styles.inputDisabled]}>
      <TextInput
        shadow="input"
        {...props}
        style={styles.input}
        ref={forwardedRef as any}
        editable={editable}
        onChangeText={onChangeText}
        numberOfLines={1}
        placeholder="Android SDK root path"
      />
      <TouchableOpacity
        style={styles.icon}
        onPress={handleSelectFolder}
        disabled={!editable}>
        <FolderIcon fill={theme.text.default} height={18} width={18} />
      </TouchableOpacity>
    </Row>
  );
});

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
