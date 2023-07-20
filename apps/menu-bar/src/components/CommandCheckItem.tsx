import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  StyleSheet,
} from 'react-native';
import {spacing} from '@expo/styleguide-native';

import AlertIcon from '../assets/icons/alert-triangle.svg';
import CheckIcon from '../assets/icons/check-circle.svg';
import {View} from './View';
import {Text} from './Text';

interface Props {
  title: string;
  description: string;
  reason?: string;
  success?: boolean;
  icon: ImageSourcePropType;
}

const CommandCheckItem = ({
  description,
  icon,
  title,
  reason,
  success,
}: Props) => {
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
        {reason ? <Text>{reason}</Text> : null}
      </View>
      {success === undefined ? (
        <ActivityIndicator />
      ) : success ? (
        <CheckIcon />
      ) : (
        <AlertIcon />
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
