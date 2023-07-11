import {
  Text,
  View,
  ActivityIndicator,
  PlatformColor,
  Image,
  ImageSourcePropType,
  StyleSheet,
} from 'react-native';

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
    <View style={styles.container}>
      <Image source={icon} />
      <View style={{flex: 1, marginHorizontal: 5}}>
        <Text>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {reason ? <Text>{reason}</Text> : null}
      </View>
      {success === undefined ? (
        <ActivityIndicator />
      ) : (
        <Text>{success ? '✅' : '❌'}</Text>
      )}
    </View>
  );
};

export default CommandCheckItem;

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: PlatformColor('quaternaryLabelColor'),
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  description: {
    fontSize: 12,
  },
});
