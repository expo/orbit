import { spacing } from '@expo/styleguide-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { CliCommands } from 'common-types';
import {
  ActivityIndicator,
  AlertButton,
  Image,
  ImageSourcePropType,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { errorAlert } from './ErrorAlert';
import { Text } from './Text';
import { View } from './View';
import AlertIcon from '../assets/icons/AlertTriangle';
import CheckIcon from '../assets/icons/check-circle.svg';

type Props = {
  title: string;
  description: string;
  icon: ImageSourcePropType;
  loading: boolean;
} & CliCommands.CheckTools.PlatformToolsCheck[keyof CliCommands.CheckTools.PlatformToolsCheck];

const CommandCheckItem = ({ description, icon, title, reason, success, loading }: Props) => {
  const showWarningAlert = () => {
    const buttons: AlertButton[] = [{ text: 'OK', style: 'default' }];
    const command = reason?.command;
    if (command) {
      buttons.unshift({
        text: 'Copy command',
        style: 'default',
        onPress: () => {
          Clipboard.setString(command);
        },
      });
    }

    errorAlert('Something went wrong', reason?.message, buttons);
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
      {loading ? (
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
