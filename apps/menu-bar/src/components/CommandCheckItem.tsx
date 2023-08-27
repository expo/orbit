import { spacing } from '@expo/styleguide-native';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { Text } from './Text';
import { View } from './View';
import AlertIcon from '../assets/icons/alert-triangle.svg';
import CheckIcon from '../assets/icons/check-circle.svg';

interface Props {
  title: string;
  description: string;
  reason?: string;
  success?: boolean;
  icon: ImageSourcePropType;
}

const CommandCheckItem = ({ description, icon, title, reason, success }: Props) => {
  const showWarningAlert = () => Alert.alert('Something went wrong', reason);

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
              {reason}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {success === undefined ? (
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
