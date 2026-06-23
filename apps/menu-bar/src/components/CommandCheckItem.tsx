import { spacing } from '@expo/styleguide-native';
import { CliCommands } from 'common-types';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import {
  ActivityIndicator,
  AlertButton,
  Image,
  ImageSourcePropType,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { Text } from './Text';
import { View } from './View';
import AlertIcon from '../assets/icons/AlertTriangle';
import CheckIcon from '../assets/icons/check-circle.svg';
import Alert from '../modules/Alert';

type Props = {
  title: string;
  description: string;
  icon: ImageSourcePropType;
  loading: boolean;
  onPressFix?: () => Promise<void>;
  fixLabel?: string;
} & CliCommands.CheckTools.PlatformToolsCheck[keyof CliCommands.CheckTools.PlatformToolsCheck];

const CommandCheckItem = ({
  description,
  icon,
  title,
  reason,
  success,
  loading,
  onPressFix,
  fixLabel,
}: Props) => {
  const [isFixing, setIsFixing] = useState(false);

  const runFix = async () => {
    if (!onPressFix || isFixing) {
      return;
    }
    setIsFixing(true);
    try {
      await onPressFix();
    } finally {
      setIsFixing(false);
    }
  };

  const showWarningAlert = () => {
    const buttons: AlertButton[] = [{ text: 'OK', style: 'default' }];
    if (onPressFix) {
      buttons.unshift({
        text: fixLabel ?? 'Install',
        style: 'default',
        onPress: runFix,
      });
    } else if (reason?.command) {
      const command = reason.command;
      buttons.unshift({
        text: 'Copy command',
        style: 'default',
        onPress: () => {
          Clipboard.setStringAsync(command);
        },
      });
    }

    Alert.alert('Something went wrong', reason?.message, buttons);
  };

  return (
    <View
      align="centered"
      padding="small"
      border="default"
      rounded="medium"
      bg="default"
      shadow="tiny"
      style={styles.container}>
      <Image source={icon} />
      <View flex="1">
        <Text weight="medium">{title}</Text>
        <Text size="tiny" color="secondary">
          {description}
        </Text>
        {reason ? (
          <TouchableOpacity onPress={showWarningAlert}>
            <Text size="tiny" color="warning" numberOfLines={2}>
              {reason.message}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {loading || isFixing ? (
        <ActivityIndicator />
      ) : success ? (
        <CheckIcon />
      ) : (
        <TouchableOpacity onPress={showWarningAlert}>
          <AlertIcon />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default CommandCheckItem;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingRight: spacing[5],
    gap: spacing[3],
  },
  description: {
    fontSize: 12,
  },
});
