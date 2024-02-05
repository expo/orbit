import { TouchableOpacity } from 'react-native';

import AlertIcon from '../assets/icons/AlertTriangle';
import { View, Text } from '../components';
import Alert from '../modules/Alert';

const DevicesListError = ({ error }: { error: Error }) => {
  return (
    <View px="4" pb="4">
      <TouchableOpacity
        style={{ alignItems: 'center' }}
        onPress={() => Alert.alert('Something went wrong', error.message)}>
        <AlertIcon width="40" height="40" />
        <Text type="InterBold">Something went wrong</Text>
        <Text color="warning" numberOfLines={2}>
          Unable to list devices, click here to see the full error
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default DevicesListError;
