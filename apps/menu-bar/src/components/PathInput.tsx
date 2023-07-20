import {
  StyleSheet,
  TouchableOpacity,
  TextInput as NativeTextInput,
} from 'react-native';
import React from 'react';

import FilePicker from '../modules/FilePickerModule';
import {useExpoTheme} from '../utils/useExpoTheme';
import {TextInput} from './Text';
import {Row} from './View';
import FolderIcon from '../assets/icons/folder.svg';

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
      bg="overlay"
      align="center"
      style={{
        overflow: 'hidden',
        opacity: editable ? 1 : 0.7,
      }}>
      <TextInput
        shadow="input"
        px="small"
        py="tiny"
        {...props}
        style={styles.input}
        ref={forwardedRef as any}
        editable={editable}
        onChangeText={onChangeText}
        numberOfLines={1}
      />
      <TouchableOpacity
        onPress={handleSelectFolder}
        disabled={!editable}
        style={{marginRight: 8}}>
        <FolderIcon fill={theme.text.default} height={18} width={18} />
      </TouchableOpacity>
    </Row>
  );
});

export default PathInput;

const styles = StyleSheet.create({
  input: {
    flex: 1,
    textAlignVertical: 'center',
    justifyContent: 'center',
    textAlign: 'left',
    verticalAlign: 'middle',
    fontSize: 12,
  },
});
